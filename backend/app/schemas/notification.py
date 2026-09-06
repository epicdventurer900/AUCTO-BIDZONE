from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    room_id: int | None
    type: NotificationType
    message: str
    is_read: bool
    created_at: datetime
