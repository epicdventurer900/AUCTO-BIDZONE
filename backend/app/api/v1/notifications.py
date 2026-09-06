from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DbSession
from app.schemas.notification import NotificationResponse
from app.services.notification_service import list_user_notifications, mark_all_read, mark_notification_read

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=list[NotificationResponse])
def get_notifications(current_user: CurrentUser, db: DbSession, unread_only: bool = False):
    return list_user_notifications(db, current_user.id, unread_only=unread_only)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def read_notification(notification_id: int, current_user: CurrentUser, db: DbSession):
    notification = mark_notification_read(db, notification_id, current_user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@router.post("/read-all")
def read_all_notifications(current_user: CurrentUser, db: DbSession):
    count = mark_all_read(db, current_user.id)
    return {"marked_read": count}
