"""Daily quests/challenges system."""
from __future__ import annotations

from datetime import date, timedelta, timezone
from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser
from app.core.store import iso_now
from app.schemas.auth import GenericMessageResponse

router = APIRouter(prefix="/quests", tags=["quests"])


def _get_today_key() -> str:
    """Get today's date key for quests."""
    return date.today().isoformat()


def _get_user_quests_data(uid: int) -> dict:
    """Load user quest progress from store cache (in-memory only for now)."""
    # Use storage._data as a simple cache layer
    from app.core.store import storage

    if "user_quests" not in storage._data:
        storage._data["user_quests"] = []

    today_key = _get_today_key()
    for q in storage._data["user_quests"]:
        if q.get("user_id") == uid and q.get("date_key") == today_key:
            return q
    return None


def _ensure_user_quests(uid: int) -> dict:
    """Get or create today's quest data for user."""
    from app.core.store import storage

    existing = _get_user_quests_data(uid)
    if existing is not None:
        return existing

    today_key = _get_today_key()
    today_quests = generate_daily_quests(today_key)

    entry = {
        "user_id": uid,
        "date_key": today_key,
        "issued_at": iso_now(),
        "quests": [],  # filled below with completed IDs
        "completed_ids": [],
    }

    storage._data["user_quests"].append(entry)

    return entry


def generate_daily_quests(date_key: str) -> list[dict]:
    """Generate today's quests (deterministic by date, random-feeling)."""
    import hashlib

    h = int(hashlib.sha256((date_key + "gel-daily-quests-v1").encode()).hexdigest(), 16)
    seed = float(h % 10000) / 10000.0

    # Quest templates
    quest_pool = [
        {"id": "read_lessons", "title": "Knowledge Seeker", "description": "Complete 2 lessons today",
         "requirement": {"type": "lessons_completed", "count": 2}, "xp_reward": 50},
        {"id": "streak_keep", "title": "Consistency Matters", "description": "Log in and maintain your streak",
         "requirement": {"type": "streak_check"}, "xp_reward": 30},
        {"id": "perfect_score", "title": "Perfectionist", "description": "Score 90%+ on one lesson",
         "requirement": {"type": "high_score", "threshold": 90}, "xp_reward": 75},
        {"id": "quick_study", "title": "Speed Runner", "description": "Complete a lesson in under 3 minutes",
         "requirement": {"type": "fast_completion", "max_seconds": 180}, "xp_reward": 40},
        {"id": "multi_subject", "title": "Renaissance Mind", "description": "Study lessons from 2 different courses",
         "requirement": {"type": "different_courses", "count": 2}, "xp_reward": 60},
        {"id": "total_xp_goal", "title": "XP Hunter", "description": "Earn 100 XP today through lessons",
         "requirement": {"type": "daily_xp", "threshold": 100}, "xp_reward": 80},
    ]

    # Shuffle deterministically based on seed
    import random
    rng = random.Random(seed)
    shuffled = quest_pool.copy()
    rng.shuffle(shuffled)

    # Pick 3 quests for today
    selected = shuffled[:3]
    return [{"id": q["id"], "title": q["title"], "description": q["description"],
             "xp_reward": q["xp_reward"], "completed": False} for q in selected]


@router.get("")
async def get_today_quests(user: CurrentUser):
    """Get today's quests and progress."""
    data = _ensure_user_quests(user.id)

    quests = data.get("quests", [])
    if not quests:
        quests = generate_daily_quests(data["date_key"])
        data["quests"] = quests

    completed_ids = data.get("completed_ids", [])

    return {
        "date": data["date_key"],
        "quests": [
            {**q, "completed": q["id"] in completed_ids}
            for q in quests
        ],
    }


@router.post("/check-progress")
async def check_quest_progress(user: CurrentUser):
    """Check and mark completed quests based on activity."""
    data = _ensure_user_quests(user.id)
    if "quests" not in data or not data["quests"]:
        return {"message": "No active quests"}

    completed_ids_before = set(data.get("completed_ids", []))
    new_completions = []

    for quest in data["quests"]:
        if quest["id"] in completed_ids_before:
            continue

        qid = quest["id"]
        completed = False

        # Check each quest type (stub checks — integrate with lesson completion)
        if qid == "streak_keep" and user.streak_current >= 1:
            completed = True

    # Update data
    for q in data["quests"]:
        if q["id"] not in completed_ids_before and q["id"] in new_completions:
            quest_obj = next((qq for qq in data["quests"] if qq["id"] == q["id"]), None)
            if quest_obj:
                user.add_xp(quest_obj.get("xp_reward", 0))

    completed_ids_before.update(new_completions)
    data["completed_ids"] = list(completed_ids_before)

    await User.objects().update(user)

    return {"message": f"{len(new_completions)} new quests completed", "newly_completed": new_completions}


# Import needed above
from app.core.store import User  # noqa: E402
