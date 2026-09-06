from fastapi import APIRouter

from app.api.v1 import audit, auth, notifications, rooms, users, websocket


api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(rooms.router)
api_router.include_router(audit.router)
api_router.include_router(notifications.router)
api_router.include_router(websocket.router)

