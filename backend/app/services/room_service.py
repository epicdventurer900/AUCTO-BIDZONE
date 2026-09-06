from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.auction_item import AuctionItem
from app.models.room import Room, RoomStatus
from app.models.room_member import RoomMember, RoomRole
from app.models.team import Team
from app.schemas.room import AuctionItemCreate, RoomCreate, RoomJoin, RoomUpdate
from app.services.auth_service import generate_room_code


def create_room(db: Session, creator_id: int, data: RoomCreate) -> Room:
    room = Room(
        room_code=generate_room_code(db),
        name=data.name,
        auction_type=data.auction_type,
        visibility=data.visibility,
        description=data.description,
        timer_seconds=data.timer_seconds,
        bid_increment=data.bid_increment,
        auto_extend_seconds=data.auto_extend_seconds,
        confirmation_seconds=data.confirmation_seconds,
        purse_per_team=data.purse_per_team,
        max_auctioneers=data.max_auctioneers,
        created_by_id=creator_id,
        status=RoomStatus.SETUP,
    )
    db.add(room)
    db.flush()

    member = RoomMember(
        room_id=room.id,
        user_id=creator_id,
        role=RoomRole.AUCTIONEER,
        display_name=None,
        role_locked=False,
    )
    db.add(member)
    db.add(
        AuditLog(
            room_id=room.id,
            user_id=creator_id,
            action="room_created",
            message=f"Room '{room.name}' created",
        )
    )
    db.commit()
    db.refresh(room)
    return room


def update_room(db: Session, room: Room, data: RoomUpdate) -> Room:
    if room.status not in (RoomStatus.DRAFT, RoomStatus.SETUP):
        raise ValueError("Room settings cannot be changed after auction starts")

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(room, field, value)

    db.commit()
    db.refresh(room)
    return room


def join_room(db: Session, user_id: int, data: RoomJoin) -> RoomMember:
    room = db.query(Room).filter(Room.room_code == data.room_code.upper()).first()
    if not room:
        raise ValueError("Room not found")

    if room.status not in (RoomStatus.DRAFT, RoomStatus.SETUP):
        raise ValueError("Cannot join room after auction has started")

    existing = (
        db.query(RoomMember)
        .filter(RoomMember.room_id == room.id, RoomMember.user_id == user_id)
        .first()
    )
    if existing:
        raise ValueError("Already a member of this room")

    if data.role == RoomRole.AUCTIONEER:
        auctioneer_count = (
            db.query(RoomMember)
            .filter(
                RoomMember.room_id == room.id,
                RoomMember.role == RoomRole.AUCTIONEER,
                RoomMember.is_active.is_(True),
            )
            .count()
        )
        if auctioneer_count >= room.max_auctioneers:
            raise ValueError("Auctioneer limit reached for this room")

    team_id = None
    if data.role == RoomRole.BIDDER:
        if not data.team_name:
            raise ValueError("Team name is required for bidders")
        team = Team(
            room_id=room.id,
            name=data.team_name.strip(),
            purse_total=room.purse_per_team,
            purse_remaining=room.purse_per_team,
        )
        db.add(team)
        db.flush()
        team_id = team.id

    member = RoomMember(
        room_id=room.id,
        user_id=user_id,
        role=data.role,
        team_id=team_id,
        display_name=data.display_name or data.team_name,
    )
    db.add(member)
    db.add(
        AuditLog(
            room_id=room.id,
            user_id=user_id,
            action="room_joined",
            message=f"User joined as {data.role.value}",
        )
    )
    db.commit()
    db.refresh(member)
    return member


def add_auction_item(
    db: Session, room: Room, user_id: int, data: AuctionItemCreate
) -> AuctionItem:
    if room.status not in (RoomStatus.DRAFT, RoomStatus.SETUP):
        raise ValueError("Cannot add items after auction has started")

    member = _get_auctioneer(db, room.id, user_id)
    if not member:
        raise PermissionError("Only auctioneers can add items")

    item = AuctionItem(
        room_id=room.id,
        name=data.name,
        description=data.description,
        category=data.category,
        base_price=data.base_price,
        sort_order=data.sort_order,
        extra_data=data.extra_data,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_user_membership(db: Session, room_id: int, user_id: int) -> RoomMember | None:
    return (
        db.query(RoomMember)
        .filter(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id,
            RoomMember.is_active.is_(True),
        )
        .first()
    )


def _get_auctioneer(db: Session, room_id: int, user_id: int) -> RoomMember | None:
    return (
        db.query(RoomMember)
        .filter(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id,
            RoomMember.role == RoomRole.AUCTIONEER,
            RoomMember.is_active.is_(True),
        )
        .first()
    )
