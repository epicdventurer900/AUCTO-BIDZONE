from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType


def create_notification(
    db: Session,
    user_id: int,
    message: str,
    notification_type: NotificationType = NotificationType.SYSTEM,
    room_id: int | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        room_id=room_id,
        type=notification_type,
        message=message,
    )
    db.add(notification)
    return notification


def list_user_notifications(db: Session, user_id: int, unread_only: bool = False) -> list[Notification]:
    query = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    return query.order_by(Notification.created_at.desc()).limit(100).all()


def mark_notification_read(db: Session, notification_id: int, user_id: int) -> Notification | None:
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if not notification:
        return None
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_read(db: Session, user_id: int) -> int:
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .update({"is_read": True})
    )
    db.commit()
    return count
