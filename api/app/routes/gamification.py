from fastapi import APIRouter, Depends, Query

from app.core.deps import CurrentUser
from app.core.store import Achievement, User


router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/leaderboard")
async def leaderboard(limit: int = Query(50, ge=1, le=200)):
    users = [u for u in User.objects().all() if u.is_active]
    users.sort(key=lambda u: (u.level, u.total_xp_earned), reverse=True)
    users = users[:limit]

    result = []
    rank = 1
    prev_level = None
    prev_xp = None

    for i, u in enumerate(users):
        if i == 0:
            rank = 1
        elif u.level != prev_level or u.total_xp_earned != prev_xp:
            rank = i + 1

        result.append({
            "rank": rank, "id": u.id, "username": u.username,
            "level": u.level, "total_xp_earned": int(u.total_xp_earned),
            "streak_current": u.streak_current, "avatar_url": u.avatar_url,
        })
        prev_level = u.level
        prev_xp = u.total_xp_earned

    return {"leaderboard": result}


@router.get("/achievements")
async def list_achievements(rarity: str | None = Query(None)):
    achievements = [a for a in Achievement.objects().all() if a.is_active]
    if rarity:
        achievements = [a for a in achievements if a.rarity == rarity]

    return [
        {
            "id": a.id, "slug": a.slug, "title": a.title, "description": a.description,
            "achievement_type": a.achievement_type, "rarity": a.rarity,
            "icon_url": a.icon_url, "xp_reward": a.xp_reward,
        }
        for a in achievements
    ]


@router.get("/user-stats")
async def user_stats(user: CurrentUser):
    from app.core.store import xp_for_level

    xp_for_next = xp_for_level(user.level)
    progress_pct = min(100, int((user.xp_in_level / max(xp_for_next, 1)) * 100))

    return {
        "user_id": user.id, "level": user.level, "xp_in_level": user.xp_in_level,
        "xp_to_next_level": xp_for_next, "level_progress_percent": progress_pct,
        "total_xp_earned": int(user.total_xp_earned), "streak_current": user.streak_current,
        "streak_longest": user.streak_longest, "achievements_count": len(user.achievement_ids),
        "badges": user.badges,
    }


@router.get("/user-achievements")
async def user_achievements(user: CurrentUser):
    if not user.achievement_ids:
        return {"achievements": []}

    all_achievements = Achievement.objects().all()
    unlocked = [a for a in all_achievements if a.id in user.achievement_ids]

    return {
        "achievements": [
            {"id": a.id, "slug": a.slug, "title": a.title, "description": a.description,
             "rarity": a.rarity, "icon_url": a.icon_url}
            for a in unlocked
        ]
    }


@router.post("/check-achievements")
async def check_and_award_achievements(user: CurrentUser):
    newly_unlocked = []
    all_achievements = [a for a in Achievement.objects().all() if a.is_active]

    for ach in all_achievements:
        if ach.id in user.achievement_ids:
            continue

        rule = ach.rule_definition or {}
        should_award = False

        if rule.get("type") == "level_reached":
            required_level = rule.get("level", 999)
            if user.level >= required_level:
                should_award = True

        elif rule.get("type") == "streak_reached":
            required_streak = rule.get("streak_days", 999)
            if user.streak_current >= required_streak:
                should_award = True

        elif rule.get("type") == "total_xp_reached":
            required_xp = rule.get("xp_threshold", float("inf"))
            if user.total_xp_earned >= required_xp:
                should_award = True

        if should_award and ach.id not in user.achievement_ids:
            user.achievement_ids.append(ach.id)
            user.add_xp(ach.xp_reward)
            newly_unlocked.append({
                "id": ach.id, "title": ach.title, "rarity": ach.rarity,
                "xp_awarded": ach.xp_reward,
            })

    await User.objects().update(user)

    return {"newly_unlocked": newly_unlocked, "total_achievements": len(user.achievement_ids)}
