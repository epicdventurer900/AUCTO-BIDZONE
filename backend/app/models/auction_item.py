import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.database import Base


class ItemStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SOLD = "sold"
    UNSOLD = "unsold"


class AuctionItem(Base):
    __tablename__ = "auction_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    base_price: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[ItemStatus] = mapped_column(SqlEnum(ItemStatus, name="item_status"), default=ItemStatus.PENDING)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    sold_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sold_to_team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True)
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="items", foreign_keys=[room_id])
    sold_to_team = relationship("Team", back_populates="won_items")
    bids = relationship("Bid", back_populates="item", cascade="all, delete-orphan")
