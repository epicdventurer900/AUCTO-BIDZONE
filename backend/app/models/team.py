from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.database import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    purse_total: Mapped[int] = mapped_column(Integer)
    purse_remaining: Mapped[int] = mapped_column(Integer)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="teams")
    members = relationship("RoomMember", back_populates="team")
    won_items = relationship("AuctionItem", back_populates="sold_to_team")
    bids = relationship("Bid", back_populates="team")
