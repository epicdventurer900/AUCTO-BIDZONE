from sqlalchemy.orm import Session

from app.models.chat import ChatMessage
from app.models.room import Room
from app.models.room_member import RoomMember
from app.schemas.room import ChatMessageCreate
from app.services.room_service import get_user_membership
from app.websocket.manager import ws_manager


async def send_chat(db: Session, room: Room, user_id: int, data: ChatMessageCreate) -> ChatMessage:
    member = get_user_membership(db, room.id, user_id)
    if not member:
        raise PermissionError("Not a room member")

    msg = ChatMessage(room_id=room.id, user_id=user_id, message=data.message.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)

    await ws_manager.broadcast(
        room.id,
        "chat_message",
        {"id": msg.id, "user_id": user_id, "message": msg.message, "created_at": msg.created_at.isoformat()},
    )
    return msg
