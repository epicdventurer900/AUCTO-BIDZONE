from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserUpdate(BaseModel):
    name: str | None = None


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    is_admin: bool
    created_at: datetime
