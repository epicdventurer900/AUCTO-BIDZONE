from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.auction_engine.service import (
    end_auction,
    get_auction_report,
    get_auction_state,
    next_item,
    pause_auction,
    place_bid,
    resume_auction,
    start_auction,
)
from app.chat.service import send_chat
from app.models.auction_item import AuctionItem
from app.models.chat import ChatMessage
from app.models.room import Room
from app.models.room_member import RoomMember, RoomRole
from app.models.team import Team
from app.schemas.room import (
    AuctionItemCreate,
    AuctionItemResponse,
    AuctionReportResponse,
    AuctionStateResponse,
    BidResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    PlaceBidRequest,
    RoomCreate,
    RoomJoin,
    RoomMemberResponse,
    RoomResponse,
    RoomUpdate,
    TeamResponse,
)
from app.services.room_service import (
    add_auction_item,
    create_room,
    get_user_membership,
    join_room,
    update_room,
)

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("/", response_model=RoomResponse, status_code=201)
def create_new_room(data: RoomCreate, current_user: CurrentUser, db: DbSession):
    return create_room(db, current_user.id, data)


@router.get("/", response_model=list[RoomResponse])
def list_my_rooms(current_user: CurrentUser, db: DbSession):
    return (
        db.query(Room)
        .join(RoomMember, RoomMember.room_id == Room.id)
        .filter(RoomMember.user_id == current_user.id, RoomMember.is_active.is_(True))
        .order_by(Room.created_at.desc())
        .all()
    )


@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: int, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    _require_member(db, room_id, current_user.id)
    return room


@router.patch("/{room_id}", response_model=RoomResponse)
def patch_room(room_id: int, data: RoomUpdate, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    _require_auctioneer(db, room_id, current_user.id)
    try:
        return update_room(db, room, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/join", response_model=RoomMemberResponse, status_code=201)
def join_existing_room(data: RoomJoin, current_user: CurrentUser, db: DbSession):
    try:
        return join_room(db, current_user.id, data)
    except PermissionError as exc:
        # Role escalation attempts are authorization failures, not server errors.
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{room_id}/members", response_model=list[RoomMemberResponse])
def list_members(room_id: int, current_user: CurrentUser, db: DbSession):
    _get_room(db, room_id)
    _require_member(db, room_id, current_user.id)
    return db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.is_active.is_(True)).all()


@router.get("/{room_id}/teams", response_model=list[TeamResponse])
def list_teams(room_id: int, current_user: CurrentUser, db: DbSession):
    _get_room(db, room_id)
    _require_member(db, room_id, current_user.id)
    return db.query(Team).filter(Team.room_id == room_id).order_by(Team.name).all()


@router.post("/{room_id}/items", response_model=AuctionItemResponse, status_code=201)
def create_item(room_id: int, data: AuctionItemCreate, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    try:
        return add_auction_item(db, room, current_user.id, data)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=403 if isinstance(exc, PermissionError) else 400, detail=str(exc))


@router.get("/{room_id}/items", response_model=list[AuctionItemResponse])
def list_items(room_id: int, current_user: CurrentUser, db: DbSession):
    _get_room(db, room_id)
    _require_member(db, room_id, current_user.id)
    return db.query(AuctionItem).filter(AuctionItem.room_id == room_id).order_by(AuctionItem.sort_order, AuctionItem.id).all()


@router.get("/{room_id}/auction/state", response_model=AuctionStateResponse)
def auction_state(room_id: int, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    _require_member(db, room_id, current_user.id)
    return get_auction_state(db, room)


@router.post("/{room_id}/auction/start", response_model=AuctionStateResponse)
async def auction_start(room_id: int, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    try:
        return await start_auction(db, room, current_user.id)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=403 if isinstance(exc, PermissionError) else 400, detail=str(exc))


@router.post("/{room_id}/auction/pause", response_model=AuctionStateResponse)
async def auction_pause(room_id: int, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    try:
        return await pause_auction(db, room, current_user.id)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=403 if isinstance(exc, PermissionError) else 400, detail=str(exc))


@router.post("/{room_id}/auction/resume", response_model=AuctionStateResponse)
async def auction_resume(room_id: int, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    try:
        return await resume_auction(db, room, current_user.id)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=403 if isinstance(exc, PermissionError) else 400, detail=str(exc))


@router.post("/{room_id}/auction/next", response_model=AuctionStateResponse)
async def auction_next(room_id: int, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    try:
        return await next_item(db, room, current_user.id)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=403 if isinstance(exc, PermissionError) else 400, detail=str(exc))


@router.post("/{room_id}/auction/end", response_model=AuctionStateResponse)
async def auction_end(room_id: int, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    try:
        return await end_auction(db, room, current_user.id)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=403 if isinstance(exc, PermissionError) else 400, detail=str(exc))


@router.post("/{room_id}/bids", response_model=BidResponse, status_code=201)
async def create_bid(room_id: int, data: PlaceBidRequest, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    try:
        return await place_bid(db, room, current_user.id, data)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{room_id}/chat", response_model=ChatMessageResponse, status_code=201)
async def post_chat(room_id: int, data: ChatMessageCreate, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    try:
        return await send_chat(db, room, current_user.id, data)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))


@router.get("/{room_id}/chat", response_model=list[ChatMessageResponse])
def get_chat(room_id: int, current_user: CurrentUser, db: DbSession):
    _get_room(db, room_id)
    _require_member(db, room_id, current_user.id)
    return db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.created_at).limit(100).all()


@router.get("/{room_id}/report", response_model=AuctionReportResponse)
def room_report(room_id: int, current_user: CurrentUser, db: DbSession):
    room = _get_room(db, room_id)
    _require_member(db, room_id, current_user.id)
    return get_auction_report(db, room)


def _get_room(db: DbSession, room_id: int) -> Room:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


def _require_member(db: DbSession, room_id: int, user_id: int) -> RoomMember:
    member = get_user_membership(db, room_id, user_id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a room member")
    return member


def _require_auctioneer(db: DbSession, room_id: int, user_id: int) -> RoomMember:
    member = _require_member(db, room_id, user_id)
    if member.role != RoomRole.AUCTIONEER:
        raise HTTPException(status_code=403, detail="Auctioneer access required")
    return member
