"""Real-time notification system with WebSocket support."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from app.core.deps import CurrentUser, get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


# In-memory connection manager — use Redis pub/sub for production
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}  # user_id -> [ws]

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket):
        for uid, conns in list(self.active_connections.items()):
            if websocket in conns:
                conns.remove(websocket)
                if not conns:
                    del self.active_connections[uid]

    async def send_personal(self, user_id: int, message: dict):
        conns = self.active_connections.get(user_id, [])
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


def _get_user_notifications(uid: int) -> list:
    """Load notifications from storage cache."""
    from app.core.store import storage

    if "notifications" not in storage._data:
        storage._data["notifications"] = []

    return [n for n in storage._data["notifications"] if n.get("user_id") == uid]


def _create_notification(user_id: int, type_: str, title: str, message: str, data: dict | None = None) -> dict:
    """Create a new notification entry."""
    from app.core.store import storage, iso_now

    nxt = storage._next_ids.setdefault("notifications", 1)
    notif = {
        "id": nxt,
        "user_id": user_id,
        "type": type_,
        "title": title,
        "message": message,
        "data": data or {},
        "read": False,
        "created_at": iso_now(),
    }

    if "notifications" not in storage._data:
        storage._data["notifications"] = []
    storage._data["notifications"].append(notif)
    storage._next_ids["notifications"] = nxt + 1

    # Save to disk
    import os, json
    from pathlib import Path
    DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
    fp = DATA_DIR / "notifications.json"
    try:
        with open(fp.with_suffix(".json.tmp"), "w") as f:
            json.dump(storage._data["notifications"], f, indent=2)
        os.replace(str(fp.with_suffix(".json.tmp")), str(fp))
    except Exception:
        pass

    return notif


# WebSocket endpoint for real-time updates
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time notification feed via WebSocket."""
    # Extract token from query param
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="No auth token")
        return

    try:
        payload = __import__("app.core.security", fromlist=["decode_token"]).decode_token(token)
        user_id = int(payload["sub"])
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await manager.connect(websocket, user_id)

    # Send pending notifications on connect
    pending = [n for n in _get_user_notifications(user_id) if not n.get("read")]
    if pending:
        await websocket.send_json({"type": "batch", "notifications": pending})

    try:
        while True:
            data = await websocket.receive_text()
            # Echo heartbeat / simple protocol
            await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.get("")
async def get_notifications(
    user: CurrentUser,
    unread_only: bool = False,
    limit: int = 50,
):
    """Get notification history."""
    notifs = _get_user_notifications(user.id)

    if unread_only:
        notifs = [n for n in notifs if not n.get("read")]

    notifs.sort(key=lambda x: x["created_at"], reverse=True)

    return {
        "notifications": notifs[:limit],
        "unread_count": len([n for n in notifs if not n.get("read")]),
    }


@router.post("/{notif_id}/read")
async def mark_as_read(user: CurrentUser, notif_id: int):
    """Mark a notification as read."""
    from app.core.store import storage

    notifs = storage._data.get("notifications", [])
    for n in notifs:
        if n.get("id") == notif_id and n.get("user_id") == user.id:
            n["read"] = True
            break

    return {"message": "Notification marked as read"}


@router.post("/mark-all-read")
async def mark_all_read(user: CurrentUser):
    """Mark all notifications as read."""
    from app.core.store import storage

    notifs = storage._data.get("notifications", [])
    for n in notifs:
        if n.get("user_id") == user.id and not n.get("read"):
            n["read"] = True

    return {"message": "All notifications marked as read"}


@router.delete("/{notif_id}")
async def delete_notification(user: CurrentUser, notif_id: int):
    """Delete a notification."""
    try:
        from app.core.store import storage

        notifs = storage._data.get("notifications", [])
        for i, n in enumerate(notifs):
            if n.get("id") == notif_id and n.get("user_id") == user.id:
                notifs.pop(i)
                return {"message": "Notification deleted"}

        raise HTTPException(status_code=404, detail="Notification not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting notification: {e}")


# Internal helper called by other routes when events happen
async def notify_user(user_id: int, type_: str, title: str, message: str, data: dict | None = None):
    """Create and broadcast a notification to a user."""
    notif = _create_notification(user_id, type_, title, message, data)
    await manager.send_personal(user_id, {"type": "notification", **notif})
