import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.database import Base


class AuctionType(str, enum.Enum):
    SPORTS = "sports"
    ITEMS = "items"


class RoomStatus(str, enum.Enum):
    DRAFT = "draft"
    SETUP = "setup"
    LIVE = "live"
    PAUSED = "paused"
    ENDED = "ended"


class RoomVisibility(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_code: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    auction_type: Mapped[AuctionType] = mapped_column(SqlEnum(AuctionType, name="auction_type"), default=AuctionType.SPORTS)
    status: Mapped[RoomStatus] = mapped_column(SqlEnum(RoomStatus, name="room_status"), default=RoomStatus.DRAFT)
    visibility: Mapped[RoomVisibility] = mapped_column(SqlEnum(RoomVisibility, name="room_visibility"), default=RoomVisibility.PUBLIC)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    timer_seconds: Mapped[int] = mapped_column(Integer, default=30)
    bid_increment: Mapped[int] = mapped_column(Integer, default=1)
    auto_extend_seconds: Mapped[int] = mapped_column(Integer, default=5)
    confirmation_seconds: Mapped[int] = mapped_column(Integer, default=3)
    purse_per_team: Mapped[int] = mapped_column(Integer, default=100)
    max_auctioneers: Mapped[int] = mapped_column(Integer, default=1)
    current_item_id: Mapped[int | None] = mapped_column(ForeignKey("auction_items.id", use_alter=True), nullable=True)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="created_rooms")
    members = relationship("RoomMember", back_populates="room", cascade="all, delete-orphan")
    teams = relationship("Team", back_populates="room", cascade="all, delete-orphan")
    items = relationship("AuctionItem", back_populates="room", cascade="all, delete-orphan", foreign_keys="AuctionItem.room_id")
    bids = relationship("Bid", back_populates="room", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="room", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="room", cascade="all, delete-orphan")
    current_item = relationship("AuctionItem", foreign_keys=[current_item_id], post_update=True)
