from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import ValidationError

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import TokenResponse, UserCreate, UserLogin, UserResponse
from app.services.auth_service import authenticate_user, build_token_response, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: DbSession):
    try:
        user = register_user(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return build_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(db: DbSession, form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        credentials = UserLogin(email=form_data.username, password=form_data.password)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail="Enter a valid email address") from exc

    user = authenticate_user(db, credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return build_token_response(user)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: CurrentUser):
    return current_user
