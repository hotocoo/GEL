"""Friends system — social engagement layer."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser
from app.core.store import User, iso_now
from app.routes.notifications import notify_user

router = APIRouter(prefix="/friends", tags=["friends"])


def _get_friends_cache() -> list:
    """Load friends entries from storage cache."""
    from app.core.store import storage

    if "friends" not in storage._data:
        storage._data["friends"] = []
    return storage._data["friends"]


def _save_friends():
    """Flush friends to disk."""
    from app.core.store import storage
    import os, json
    from pathlib import Path

    DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
    fp = DATA_DIR / "friends.json"
    tmp = fp.with_suffix(".json.tmp")
    try:
        with open(tmp, "w") as f:
            json.dump(storage._data["friends"], f, indent=2)
        os.replace(str(tmp), str(fp))
    except Exception:
        pass


@router.get("")
async def get_friends(user: CurrentUser):
    """Get current user's friend list."""
    friends_data = _get_friends_cache()

    result = []
    for entry in friends_data:
        if entry["user_id"] != user.id:
            continue

        target = User.objects().get(id=entry["friend_id"], is_active=True)
        if not target:
            continue

        result.append({
            "id": entry["id"],
            "status": entry.get("status", "accepted"),
            "friend": {
                "id": target.id,
                "username": target.username,
                "level": target.level,
                "avatar_url": target.avatar_url,
            },
        })

    return {"friends": result}


@router.post("/add/{target_id}")
async def add_friend(user: CurrentUser, target_id: int):
    """Send a friend request."""
    if target_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    target = User.objects().get(id=target_id, is_active=True)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    friends_data = _get_friends_cache()

    # Check existing relationship
    for entry in friends_data:
        if (entry["user_id"] == user.id and entry["friend_id"] == target_id) or            (entry["user_id"] == target_id and entry["friend_id"] == user.id):
            raise HTTPException(status_code=409, detail="Friend request already exists")

    from app.core.store import storage
    nxt = storage._next_ids.setdefault("friends", 1)
    friends_data.append({
        "id": nxt,
        "user_id": target_id,  # stored as incoming to target
        "friend_id": user.id,
        "status": "pending",
        "created_at": iso_now(),
    })
    storage._next_ids["friends"] = nxt + 1

    _save_friends()
    return {"message": f"Friend request sent to {target.username}"}


@router.post("/accept/{request_id}")
async def accept_friend(user: CurrentUser, request_id: int):
    """Accept a pending friend request."""
    friends_data = _get_friends_cache()

    for entry in friends_data:
        if entry["id"] == request_id and entry["friend_id"] == user.id and entry.get("status") == "pending":
            requester_id = entry["friend_id"]
            requester = User.objects().get(id=requester_id)
            entry["status"] = "accepted"
            entry["updated_at"] = iso_now()
            _save_friends()
            
            # Notify the friend request sender
            if requester:
                await notify_user(
                    requester.id, "friend_accepted", f"{user.username} accepted your friend request!",
                    message=f"You're now friends with {user.username}. Check out their profile!",
                    data={"friend_id": user.id},
                )
            
            return {"message": "Friend request accepted"}

    raise HTTPException(status_code=404, detail="Friend request not found")


@router.delete("/{friend_id}")
async def remove_friend(user: CurrentUser, friend_id: int):
    """Remove a friend."""
    friends_data = _get_friends_cache()

    removed = False
    for entry in list(friends_data):
        if (entry["user_id"] == user.id and entry["friend_id"] == friend_id) or            (entry["user_id"] == friend_id and entry["friend_id"] == user.id):
            friends_data.remove(entry)
            removed = True

    if not removed:
        raise HTTPException(status_code=404, detail="Friendship not found")

    _save_friends()
    return {"message": "Friend removed"}


@router.get("/suggestions")
async def friend_suggestions(user: CurrentUser):
    """Get user suggestions based on courses and level range."""
    friends_data = _get_friends_cache()
    current_friend_ids = {e["friend_id"] for e in friends_data if e["user_id"] == user.id}
    current_friend_ids.update(e["user_id"] for e in friends_data if e["friend_id"] == user.id)

    all_users = [u for u in User.objects().all()
                 if u.is_active and u.id != user.id and u.id not in current_friend_ids]

    # Filter by similar level (+-5 range)
    suggestions = [u for u in all_users if abs(u.level - user.level) <= 5][:20]

    return {
        "suggestions": [
            {"id": u.id, "username": u.username, "level": u.level, "avatar_url": u.avatar_url}
            for u in suggestions
        ]
    }
