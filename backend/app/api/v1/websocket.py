import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.auction_engine.service import get_auction_state, place_bid
from app.chat.service import send_chat
from app.core.security import decode_access_token
from app.database.database import SessionLocal
from app.models.room import Room
from app.schemas.room import ChatMessageCreate, PlaceBidRequest
from app.services.room_service import get_user_membership
from app.websocket.manager import ws_manager

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)


@router.websocket("/ws/rooms/{room_id}")
async def room_websocket(websocket: WebSocket, room_id: int, token: str):
    user_id = None
    connected = False
    db = SessionLocal()
    try:
        user_id_str = decode_access_token(token)
        if not user_id_str:
            await websocket.close(code=4001)
            return

        try:
            user_id = int(user_id_str)
        except (TypeError, ValueError):
            await websocket.close(code=4001)
            return

        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            await websocket.close(code=4004)
            return
        if not get_user_membership(db, room_id, user_id):
            await websocket.close(code=4003)
            return

        await ws_manager.connect(room_id, websocket, user_id)
        connected = True
        state = get_auction_state(db, room)
        await ws_manager.send_personal(websocket, "sync", state.model_dump(mode="json"))
        await ws_manager.broadcast(room_id, "user_status", {"user_id": user_id, "status": "online"})

        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await ws_manager.send_personal(websocket, "error", {"message": "Invalid WebSocket message"})
                continue

            if not isinstance(payload, dict):
                await ws_manager.send_personal(websocket, "error", {"message": "Invalid WebSocket payload"})
                continue

            event = payload.get("event")
            data = payload.get("data", {})
            if not isinstance(data, dict):
                await ws_manager.send_personal(websocket, "error", {"message": "Invalid event data"})
                continue

            if event == "place_bid":
                try:
                    bid = await place_bid(db, room, user_id, PlaceBidRequest.model_validate(data))
                    await ws_manager.send_personal(websocket, "bid_ack", {"bid_id": bid.id, "amount": bid.amount})
                except (PermissionError, ValueError, ValidationError) as exc:
                    await ws_manager.send_personal(websocket, "error", {"message": str(exc)})
                except Exception:
                    logger.exception("Unexpected WebSocket bid error for room %s", room_id)
                    await ws_manager.send_personal(websocket, "error", {"message": "Unable to place bid"})

            elif event == "request_sync":
                room = db.query(Room).filter(Room.id == room_id).first()
                if not room:
                    await ws_manager.send_personal(websocket, "error", {"message": "Room not found"})
                    continue
                state = get_auction_state(db, room)
                await ws_manager.send_personal(websocket, "sync", state.model_dump(mode="json"))

            elif event == "send_chat":
                try:
                    room = db.query(Room).filter(Room.id == room_id).first()
                    if not room:
                        await ws_manager.send_personal(websocket, "error", {"message": "Room not found"})
                        continue
                    await send_chat(db, room, user_id, ChatMessageCreate.model_validate(data))
                except (PermissionError, ValueError, ValidationError) as exc:
                    await ws_manager.send_personal(websocket, "error", {"message": str(exc)})
                except Exception:
                    logger.exception("Unexpected WebSocket chat error for room %s", room_id)
                    await ws_manager.send_personal(websocket, "error", {"message": "Unable to send chat message"})

    except WebSocketDisconnect:
        pass
    finally:
        if connected and user_id is not None:
            ws_manager.disconnect(room_id, websocket)
            await ws_manager.broadcast(room_id, "user_status", {"user_id": user_id, "status": "offline"})
        db.close()
