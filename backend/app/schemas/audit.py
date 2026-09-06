from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    room_id: int | None
    user_id: int | None
    action: str
    details: dict | None
    message: str | None
    created_at: datetime
