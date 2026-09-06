from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas.user import UserPublic, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
def read_profile(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=UserPublic)
def update_profile(data: UserUpdate, current_user: CurrentUser, db: DbSession):
    if data.name is not None:
        current_user.name = data.name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/", response_model=list[UserPublic])
def list_users(current_user: CurrentUser, db: DbSession):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return db.query(User).order_by(User.id).all()
