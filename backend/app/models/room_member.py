import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.database import Base


class RoomRole(str, enum.Enum):
    AUCTIONEER = "auctioneer"
    BIDDER = "bidder"
    VIEWER = "viewer"


class RoomMember(Base):
    __tablename__ = "room_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[RoomRole] = mapped_column(SqlEnum(RoomRole, name="room_role"))
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="members")
    user = relationship("User", back_populates="room_memberships")
    team = relationship("Team", back_populates="members")
