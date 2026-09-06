from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.auction_item import ItemStatus
from app.models.room import AuctionType, RoomStatus, RoomVisibility
from app.models.room_member import RoomRole


class RoomCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    auction_type: AuctionType = AuctionType.SPORTS
    visibility: RoomVisibility = RoomVisibility.PUBLIC
    description: str | None = None
    timer_seconds: int = Field(default=30, ge=5, le=300)
    bid_increment: int = Field(default=1, ge=1)
    auto_extend_seconds: int = Field(default=5, ge=0, le=60)
    confirmation_seconds: int = Field(default=3, ge=1, le=30)
    purse_per_team: int = Field(default=100, ge=1)
    max_auctioneers: int = Field(default=1, ge=1, le=5)


class RoomUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    timer_seconds: int | None = Field(default=None, ge=5, le=300)
    bid_increment: int | None = Field(default=None, ge=1)
    auto_extend_seconds: int | None = Field(default=None, ge=0, le=60)
    confirmation_seconds: int | None = Field(default=None, ge=1, le=30)
    purse_per_team: int | None = Field(default=None, ge=1)
    visibility: RoomVisibility | None = None


class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    room_code: str
    name: str
    auction_type: AuctionType
    status: RoomStatus
    visibility: RoomVisibility
    created_by_id: int
    timer_seconds: int
    bid_increment: int
    auto_extend_seconds: int
    confirmation_seconds: int
    purse_per_team: int
    max_auctioneers: int
    current_item_id: int | None
    description: str | None
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime


class RoomJoin(BaseModel):
    room_code: str = Field(min_length=4, max_length=8)
    role: RoomRole
    display_name: str | None = Field(default=None, max_length=100)
    team_name: str | None = Field(default=None, max_length=100)


class RoomMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    room_id: int
    user_id: int
    role: RoomRole
    team_id: int | None
    display_name: str | None
    role_locked: bool
    is_active: bool
    joined_at: datetime


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    room_id: int
    name: str
    purse_total: int
    purse_remaining: int
    color: str | None
    created_at: datetime


class AuctionItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    category: str | None = None
    base_price: int = Field(default=0, ge=0)
    sort_order: int = Field(default=0, ge=0)
    extra_data: dict | None = None


class AuctionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    room_id: int
    name: str
    description: str | None
    category: str | None
    base_price: int
    status: ItemStatus
    sort_order: int
    sold_price: int | None
    sold_to_team_id: int | None
    extra_data: dict | None
    created_at: datetime


class PlaceBidRequest(BaseModel):
    amount: int = Field(ge=1)


class BidResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    room_id: int
    item_id: int
    team_id: int
    user_id: int
    amount: int
    is_valid: bool
    created_at: datetime


class AuctionStateResponse(BaseModel):
    room: RoomResponse
    current_item: AuctionItemResponse | None
    highest_bid: BidResponse | None
    timer_remaining: int
    phase: str
    teams: list[TeamResponse]


class ChatMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=500)


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    room_id: int
    user_id: int
    message: str
    created_at: datetime


class AuctionReportResponse(BaseModel):
    room_id: int
    room_name: str
    total_items: int
    sold_count: int
    unsold_count: int
    total_spend: int
    teams: list[TeamResponse]
    sold_items: list[AuctionItemResponse]
    unsold_items: list[AuctionItemResponse]
