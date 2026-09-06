import secrets
import string

from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, TokenResponse, UserResponse


def register_user(db: Session, data: UserCreate) -> User:
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise ValueError("Email already registered")

    password_hash = hash_password(data.password)
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=password_hash,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _authenticate_with_legacy_password(db: Session, user: User, password: str) -> bool:
    try:
        legacy_password = db.execute(
            text("SELECT password FROM users WHERE id = :user_id"),
            {"user_id": user.id},
        ).scalar_one_or_none()
    except ProgrammingError:
        db.rollback()
        return False
    if not legacy_password:
        return False

    try:
        if verify_password(password, legacy_password):
            if user.hashed_password != legacy_password:
                user.hashed_password = legacy_password
                db.add(user)
                db.commit()
                db.refresh(user)
            return True
    except Exception:
        pass

    if legacy_password != password:
        return False

    password_hash = hash_password(password)
    user.hashed_password = password_hash
    db.add(user)
    db.execute(
        text("UPDATE users SET password = :password_hash WHERE id = :user_id"),
        {"password_hash": password_hash, "user_id": user.id},
    )
    db.commit()
    db.refresh(user)
    return True


def authenticate_user(db: Session, data: UserLogin) -> User | None:
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return None

    try:
        if verify_password(data.password, user.hashed_password):
            return user
    except Exception:
        pass

    if _authenticate_with_legacy_password(db, user, data.password):
        return user

    return None


def build_token_response(user: User) -> TokenResponse:
    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


def generate_room_code(db: Session, length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(length))
        from app.models.room import Room

        if not db.query(Room).filter(Room.room_code == code).first():
            return code
