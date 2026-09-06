from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DbSession

from app.models.audit_log import AuditLog
from app.models.room import Room
from app.models.room_member import RoomMember
from app.schemas.audit import AuditLogResponse
from app.services.room_service import get_user_membership

router = APIRouter(prefix="/rooms", tags=["audit"])


@router.get("/{room_id}/audit-logs", response_model=list[AuditLogResponse])
def get_room_audit_logs(room_id: int, current_user: CurrentUser, db: DbSession):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    member = get_user_membership(db, room_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a room member")

    return (
        db.query(AuditLog)
        .filter(AuditLog.room_id == room_id)
        .order_by(AuditLog.created_at.desc())
        .limit(200)
        .all()
    )
