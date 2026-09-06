import asyncio
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone

from fastapi import WebSocket


@dataclass
class RoomTimerState:
    remaining: int = 0
    phase: str = "idle"  # idle | bidding | going_once | going_twice | sold
    highest_bid_id: int | None = None
    highest_amount: int = 0
    highest_team_id: int | None = None
    task: asyncio.Task | None = field(default=None, repr=False)


class ConnectionManager:
    def __init__(self):
        self.active: dict[int, list[tuple[WebSocket, int]]] = {}
        self.timers: dict[int, RoomTimerState] = {}

    async def connect(self, room_id: int, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active.setdefault(room_id, []).append((websocket, user_id))

    def disconnect(self, room_id: int, websocket: WebSocket):
        if room_id in self.active:
            self.active[room_id] = [(ws, uid) for ws, uid in self.active[room_id] if ws != websocket]
            if not self.active[room_id]:
                del self.active[room_id]

    async def broadcast(self, room_id: int, event: str, data: dict):
        message = json.dumps({"event": event, "data": data})
        for ws, _ in list(self.active.get(room_id, [])):
            try:
                await ws.send_text(message)
            except Exception:
                pass

    def get_timer(self, room_id: int) -> RoomTimerState:
        if room_id not in self.timers:
            self.timers[room_id] = RoomTimerState()
        return self.timers[room_id]

    def clear_timer_task(self, room_id: int):
        state = self.timers.get(room_id)
        if state and state.task and not state.task.done():
            state.task.cancel()

    async def send_personal(self, websocket: WebSocket, event: str, data: dict):
        await websocket.send_text(json.dumps({"event": event, "data": data}))


ws_manager = ConnectionManager()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
