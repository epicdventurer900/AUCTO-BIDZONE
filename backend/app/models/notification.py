import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.database import Base


class NotificationType(str, enum.Enum):
    BID = "bid"
    SALE = "sale"
    SYSTEM = "system"
    CHAT = "chat"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id"), nullable=True, index=True)
    type: Mapped[NotificationType] = mapped_column(SqlEnum(NotificationType, name="notification_type"))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
    room = relationship("Room", back_populates="notifications")
