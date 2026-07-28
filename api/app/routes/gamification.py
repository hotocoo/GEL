from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.deps import CurrentUser
from app.core.deps import CurrentUser as _CurrentUser
from app.core.store import Achievement, User
from app.schemas.auth import LeaderboardResponse, AchievementPublic, UserStatsResponse, StreakBonusResponse, CourseCertificateResponse


router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/leaderboard", response_model=LeaderboardResponse)
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


@router.get("/achievements", response_model=list[AchievementPublic])
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


@router.get("/user-stats", response_model=UserStatsResponse)
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


@router.get("/user-achievements", response_model=list[AchievementPublic])
async def user_achievements(user: _CurrentUser):
    if not user.achievement_ids:
        return []

    all_achievements = Achievement.objects().all()
    unlocked = [a for a in all_achievements if a.id in user.achievement_ids]

    return [
        AchievementPublic(id=a.id, slug=a.slug, title=a.title, description=a.description,
                         rarity=a.rarity, icon_url=a.icon_url)
        for a in unlocked
    ]


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

@router.post("/streak-bonus", response_model=StreakBonusResponse)
async def claim_streak_bonus(user: CurrentUser):
    """Claim extra XP for maintaining a streak."""
    if user.streak_current < 2:
        return {"message": "Streak bonus available from day 2 onwards", "xp_awarded": 0}

    # Bonus scales with streak length: 10 XP/day base, +5 per streak day above 2
    base_bonus = 10
    multiplier = min(user.streak_current - 1, 20) * 5  # caps at +100 XP extra
    bonus_xp = base_bonus + multiplier

    original_level = user.level
    user.add_xp(bonus_xp)
    leveled_up = user.level > original_level

    await User.objects().update(user)

    return {
        "message": f"Streak bonus claimed: +{bonus_xp} XP",
        "xp_awarded": bonus_xp,
        "streak_current": user.streak_current,
        "leveled_up": leveled_up,
    }


@router.get("/course-completion/{course_id}/certificate", response_model=CourseCertificateResponse)
async def get_course_certificate(course_id: int, user: CurrentUser):
    """Generate a completion certificate data for finished courses."""
    from app.core.store import CourseProgress

    cp = None
    for p in CourseProgress.objects().all():
        if p.user_id == user.id and p.course_id == course_id:
            cp = p
            break

    if not cp or not cp.is_completed:
        return {"error": "Course not completed"}

    from app.core.store import Course
    course = Course.objects().get(id=course_id)
    if not course:
        return {"error": "Course not found"}

    # Certificate data — frontend can render this as a PDF/image
    return {
        "certificate": {
            "recipient": user.username,
            "course_title": course.title,
            "course_category": course.category,
            "completion_date": cp.last_accessed_at[:10],
            "average_score": round(cp.total_score, 1),
            "lessons_completed": cp.lessons_completed_count,
        }
    }

