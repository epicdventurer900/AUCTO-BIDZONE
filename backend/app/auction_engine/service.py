import asyncio
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.auction_item import AuctionItem, ItemStatus
from app.models.bid import Bid
from app.models.room import Room, RoomStatus
from app.models.room_member import RoomMember, RoomRole
from app.models.team import Team
from app.schemas.room import AuctionReportResponse, AuctionStateResponse, PlaceBidRequest
from app.websocket.manager import ws_manager


def _require_auctioneer(db: Session, room_id: int, user_id: int) -> RoomMember:
    member = (
        db.query(RoomMember)
        .filter(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id,
            RoomMember.role == RoomRole.AUCTIONEER,
            RoomMember.is_active.is_(True),
        )
        .first()
    )
    if not member:
        raise PermissionError("Auctioneer access required")
    return member


def _lock_roles(db: Session, room_id: int):
    db.query(RoomMember).filter(RoomMember.room_id == room_id).update({"role_locked": True})


def _get_next_item(db: Session, room_id: int) -> AuctionItem | None:
    return (
        db.query(AuctionItem)
        .filter(AuctionItem.room_id == room_id, AuctionItem.status == ItemStatus.PENDING)
        .order_by(AuctionItem.sort_order, AuctionItem.id)
        .first()
    )


def _get_highest_bid(db: Session, item_id: int) -> Bid | None:
    return (
        db.query(Bid)
        .filter(Bid.item_id == item_id, Bid.is_valid.is_(True))
        .order_by(Bid.amount.desc(), Bid.id.desc())
        .first()
    )


def get_auction_state(db: Session, room: Room) -> AuctionStateResponse:
    from app.schemas.room import AuctionItemResponse, BidResponse, RoomResponse, TeamResponse

    current_item = None
    highest_bid = None
    if room.current_item_id:
        item = db.query(AuctionItem).filter(AuctionItem.id == room.current_item_id).first()
        if item:
            current_item = AuctionItemResponse.model_validate(item)
            bid = _get_highest_bid(db, item.id)
            if bid:
                highest_bid = BidResponse.model_validate(bid)

    timer = ws_manager.get_timer(room.id)
    teams = db.query(Team).filter(Team.room_id == room.id).order_by(Team.name).all()

    return AuctionStateResponse(
        room=RoomResponse.model_validate(room),
        current_item=current_item,
        highest_bid=highest_bid,
        timer_remaining=timer.remaining,
        phase=timer.phase,
        teams=[TeamResponse.model_validate(t) for t in teams],
    )


async def _run_item_timer(room_id: int, confirmation_seconds: int):
    db = SessionLocal()
    try:
        timer = ws_manager.get_timer(room_id)
        while timer.remaining > 0:
            await asyncio.sleep(1)
            timer.remaining -= 1
            await ws_manager.broadcast(room_id, "timer_update", {"remaining": timer.remaining, "phase": timer.phase})

        if timer.phase == "bidding":
            timer.phase = "going_once"
            timer.remaining = confirmation_seconds
            await ws_manager.broadcast(room_id, "auction_status", {"phase": "going_once", "message": "Going once..."})
            await _run_item_timer(room_id, confirmation_seconds)
            return

        if timer.phase == "going_once":
            timer.phase = "going_twice"
            timer.remaining = confirmation_seconds
            await ws_manager.broadcast(room_id, "auction_status", {"phase": "going_twice", "message": "Going twice..."})
            await _run_item_timer(room_id, confirmation_seconds)
            return

        if timer.phase == "going_twice":
            await _resolve_current_item(db, room_id)
    finally:
        db.close()


def _start_timer(room: Room):
    ws_manager.clear_timer_task(room.id)
    timer = ws_manager.get_timer(room.id)
    timer.remaining = room.timer_seconds
    timer.phase = "bidding"
    timer.highest_bid_id = None
    timer.highest_amount = 0
    timer.highest_team_id = None
    timer.task = asyncio.create_task(_run_item_timer(room.id, room.confirmation_seconds))


async def start_auction(db: Session, room: Room, user_id: int) -> AuctionStateResponse:
    _require_auctioneer(db, room.id, user_id)
    if room.status not in (RoomStatus.SETUP, RoomStatus.PAUSED):
        raise ValueError("Auction can only start from setup or paused state")

    item_count = db.query(AuctionItem).filter(AuctionItem.room_id == room.id).count()
    if item_count == 0:
        raise ValueError("Add auction items before starting")

    _lock_roles(db, room.id)
    room.status = RoomStatus.LIVE
    room.started_at = datetime.now(timezone.utc)
    db.commit()

    await _activate_next_item(db, room)
    db.refresh(room)
    return get_auction_state(db, room)


async def _activate_next_item(db: Session, room: Room):
    if room.current_item_id:
        old = db.query(AuctionItem).filter(AuctionItem.id == room.current_item_id).first()
        if old and old.status == ItemStatus.ACTIVE:
            old.status = ItemStatus.UNSOLD

    item = _get_next_item(db, room.id)
    if not item:
        room.status = RoomStatus.ENDED
        room.ended_at = datetime.now(timezone.utc)
        room.current_item_id = None
        db.commit()
        await ws_manager.broadcast(room.id, "auction_status", {"phase": "ended", "message": "Auction ended"})
        return

    item.status = ItemStatus.ACTIVE
    room.current_item_id = item.id
    db.commit()
    _start_timer(room)
    await ws_manager.broadcast(
        room.id,
        "player_update",
        {"item_id": item.id, "name": item.name, "base_price": item.base_price, "status": item.status.value},
    )


async def pause_auction(db: Session, room: Room, user_id: int) -> AuctionStateResponse:
    _require_auctioneer(db, room.id, user_id)
    if room.status != RoomStatus.LIVE:
        raise ValueError("Only live auctions can be paused")
    ws_manager.clear_timer_task(room.id)
    room.status = RoomStatus.PAUSED
    db.commit()
    await ws_manager.broadcast(room.id, "auction_status", {"phase": "paused", "message": "Auction paused"})
    return get_auction_state(db, room)


async def resume_auction(db: Session, room: Room, user_id: int) -> AuctionStateResponse:
    _require_auctioneer(db, room.id, user_id)
    if room.status != RoomStatus.PAUSED:
        raise ValueError("Auction is not paused")
    room.status = RoomStatus.LIVE
    db.commit()
    _start_timer(room)
    await ws_manager.broadcast(room.id, "auction_status", {"phase": "bidding", "message": "Auction resumed"})
    return get_auction_state(db, room)


async def next_item(db: Session, room: Room, user_id: int) -> AuctionStateResponse:
    _require_auctioneer(db, room.id, user_id)
    if room.status != RoomStatus.LIVE:
        raise ValueError("Auction must be live")
    ws_manager.clear_timer_task(room.id)
    await _resolve_current_item(db, room.id, force_unsold_if_no_bid=True)
    room = db.query(Room).filter(Room.id == room.id).first()
    await _activate_next_item(db, room)
    db.refresh(room)
    return get_auction_state(db, room)


async def end_auction(db: Session, room: Room, user_id: int) -> AuctionStateResponse:
    _require_auctioneer(db, room.id, user_id)
    ws_manager.clear_timer_task(room.id)
    if room.current_item_id:
        await _resolve_current_item(db, room.id, force_unsold_if_no_bid=True)
    room.status = RoomStatus.ENDED
    room.ended_at = datetime.now(timezone.utc)
    room.current_item_id = None
    db.commit()
    await ws_manager.broadcast(room.id, "auction_status", {"phase": "ended", "message": "Auction ended by auctioneer"})
    db.refresh(room)
    return get_auction_state(db, room)


async def _resolve_current_item(db: Session, room_id: int, force_unsold_if_no_bid: bool = False):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room or not room.current_item_id:
        return

    item = db.query(AuctionItem).filter(AuctionItem.id == room.current_item_id).with_for_update().first()
    if not item or item.status != ItemStatus.ACTIVE:
        return

    bid = _get_highest_bid(db, item.id)
    if bid:
        team = db.query(Team).filter(Team.id == bid.team_id).first()
        if team:
            team.purse_remaining -= bid.amount
        item.status = ItemStatus.SOLD
        item.sold_price = bid.amount
        item.sold_to_team_id = bid.team_id
        db.add(AuditLog(room_id=room_id, user_id=bid.user_id, action="item_sold", message=f"{item.name} sold for {bid.amount}"))
        await ws_manager.broadcast(
            room_id,
            "auction_status",
            {"phase": "sold", "item_id": item.id, "sold_price": bid.amount, "team_id": bid.team_id},
        )
    elif force_unsold_if_no_bid or ws_manager.get_timer(room_id).phase == "going_twice":
        item.status = ItemStatus.UNSOLD
        await ws_manager.broadcast(room_id, "auction_status", {"phase": "unsold", "item_id": item.id})

    room.current_item_id = None
    db.commit()

    if room.status == RoomStatus.LIVE and not force_unsold_if_no_bid:
        await asyncio.sleep(2)
        room = db.query(Room).filter(Room.id == room_id).first()
        if room and room.status == RoomStatus.LIVE:
            await _activate_next_item(db, room)


async def place_bid(db: Session, room: Room, user_id: int, data: PlaceBidRequest) -> Bid:
    if room.status != RoomStatus.LIVE:
        raise ValueError("Auction is not live")

    member = (
        db.query(RoomMember)
        .filter(
            RoomMember.room_id == room.id,
            RoomMember.user_id == user_id,
            RoomMember.role == RoomRole.BIDDER,
            RoomMember.is_active.is_(True),
        )
        .first()
    )
    if not member or not member.team_id:
        raise PermissionError("Only bidders with a team can place bids")

    if not room.current_item_id:
        raise ValueError("No active item")

    # Serialize bid validation and insertion for this item. PostgreSQL row-level
    # locking prevents two concurrent bidders from validating against the same
    # previous highest bid and both being accepted.
    item = (
        db.query(AuctionItem)
        .filter(AuctionItem.id == room.current_item_id)
        .with_for_update()
        .first()
    )
    if not item or item.status != ItemStatus.ACTIVE:
        raise ValueError("No active item")

    team = db.query(Team).filter(Team.id == member.team_id).first()
    if not team:
        raise ValueError("Team not found")

    highest = _get_highest_bid(db, item.id)
    min_bid = item.base_price if not highest else highest.amount + room.bid_increment
    if data.amount < min_bid:
        raise ValueError(f"Minimum bid is {min_bid}")
    if data.amount > team.purse_remaining:
        raise ValueError("Insufficient purse balance")

    timer = ws_manager.get_timer(room.id)
    if timer.phase not in ("bidding", "going_once", "going_twice"):
        raise ValueError("Bidding is closed for this item")

    bid = Bid(
        room_id=room.id,
        item_id=item.id,
        team_id=team.id,
        user_id=user_id,
        amount=data.amount,
    )
    db.add(bid)
    db.commit()
    db.refresh(bid)

    timer.phase = "bidding"
    timer.remaining = room.timer_seconds + room.auto_extend_seconds
    timer.highest_bid_id = bid.id
    timer.highest_amount = bid.amount
    timer.highest_team_id = team.id

    await ws_manager.broadcast(
        room.id,
        "new_bid",
        {
            "bid_id": bid.id,
            "amount": bid.amount,
            "team_id": team.id,
            "team_name": team.name,
            "user_id": user_id,
            "item_id": item.id,
        },
    )
    return bid


def get_auction_report(db: Session, room: Room) -> AuctionReportResponse:
    from app.schemas.room import AuctionItemResponse, TeamResponse

    items = db.query(AuctionItem).filter(AuctionItem.room_id == room.id).all()
    sold = [i for i in items if i.status == ItemStatus.SOLD]
    unsold = [i for i in items if i.status == ItemStatus.UNSOLD]
    teams = db.query(Team).filter(Team.room_id == room.id).all()

    return AuctionReportResponse(
        room_id=room.id,
        room_name=room.name,
        total_items=len(items),
        sold_count=len(sold),
        unsold_count=len(unsold),
        total_spend=sum(i.sold_price or 0 for i in sold),
        teams=[TeamResponse.model_validate(t) for t in teams],
        sold_items=[AuctionItemResponse.model_validate(i) for i in sold],
        unsold_items=[AuctionItemResponse.model_validate(i) for i in unsold],
    )
