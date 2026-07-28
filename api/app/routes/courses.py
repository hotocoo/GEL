from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser
from app.core.store import Achievement, Course, CourseProgress, Lesson, LessonCompletion, User, iso_now
from app.routes.notifications import notify_user
from app.schemas.auth import (
    CourseDetail, CourseListItem, CourseProgressItem, LessonCompletionRequest,
    LessonCompletionResponse, LessonContent, LessonPublic,
)

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CourseListItem])
async def list_courses(
    category: str | None = Query(None),
    difficulty: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    courses = Course.objects().all()
    
    if category:
        courses = [c for c in courses if c.category == category]
    if difficulty:
        courses = [c for c in courses if c.difficulty == difficulty]
    
    courses = [c for c in courses if c.is_published]
    courses.sort(key=lambda c: c.created_at, reverse=True)
    courses = courses[offset : offset + limit]

    return [
        CourseListItem(
            id=c.id, slug=c.slug, title=c.title, description=(c.description or "")[:200],
            category=c.category, difficulty=c.difficulty, xp_reward=c.xp_reward,
            estimated_duration_minutes=c.estimated_duration_minutes,
        )
        for c in courses
    ]


@router.get("/{course_id}", response_model=CourseDetail)
async def get_course(course_id: int):
    course = Course.objects().get(id=course_id)
    if not course or not course.is_published:
        raise HTTPException(status_code=404, detail="Course not found")

    lessons = sorted(
        [l for l in Lesson.objects().all() if l.course_id == course_id and l.is_published],
        key=lambda l: l.order_index,
    )

    return CourseDetail(
        id=course.id, slug=course.slug, title=course.title, description=course.description or "",
        category=course.category, difficulty=course.difficulty, xp_reward=course.xp_reward,
        estimated_duration_minutes=course.estimated_duration_minutes, subject=course.subject,
        lessons=[LessonPublic(id=l.id, slug=l.slug, title=l.title) for l in lessons],
    )


@router.post("/{course_id}/enroll")
async def enroll_in_course(course_id: int, user: CurrentUser):
    """Enroll in a course with prerequisite validation."""
    course = Course.objects().get(id=course_id)
    if not course or not course.is_published:
        raise HTTPException(status_code=404, detail="Course not found")

    for cp in CourseProgress.objects().all():
        if cp.user_id == user.id and cp.course_id == course_id:
            raise HTTPException(status_code=400, detail="Already enrolled in this course")

    # Check prerequisite course completion
    prereq_id = course.prerequisite_course_id
    if prereq_id:
        prereq_complete = False
        for cp2 in CourseProgress.objects().all():
            if cp2.user_id == user.id and cp2.course_id == prereq_id and cp2.is_completed:
                prereq_complete = True
                break

        if not prereq_complete:
            prereq_course = Course.objects().get(id=prereq_id)
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail=f"Prerequisite required: {prereq_course.title if prereq_course else 'Course'}",
            )

    progress = await CourseProgress.objects().create(user_id=user.id, course_id=course_id)
    return {"message": "Enrolled successfully", "progress_id": progress.id}


@router.get("/{course_id}/lessons/{lesson_id}", response_model=LessonContent)
async def get_lesson(course_id: int, lesson_id: int):
    lesson = Lesson.objects().get(id=lesson_id)
    if not lesson or lesson.course_id != course_id or not lesson.is_published:
        raise HTTPException(status_code=404, detail="Lesson not found")

    return LessonContent(
        id=lesson.id, slug=lesson.slug, title=lesson.title,
        content_html=lesson.content_html, content_type=lesson.content_type,
        media_data=lesson.media_data or {}, questions=lesson.questions or [],
        xp_reward=int(lesson.xp_reward),
    )


@router.post("/{course_id}/lessons/{lesson_id}/complete")
async def complete_lesson(course_id: int, lesson_id: int, user: CurrentUser, body: LessonCompletionRequest):
    score = body.score
    attempts = max(body.attempts, 1)
    time_spent = max(body.time_spent_seconds, 0)
    answers = body.answers

    lesson = Lesson.objects().get(id=lesson_id)
    if not lesson or lesson.course_id != course_id:
        raise HTTPException(status_code=404, detail="Lesson not found")

    score = min(max(score, 0), 100)

    cp = None
    for p in CourseProgress.objects().all():
        if p.user_id == user.id and p.course_id == course_id:
            cp = p
            break

    if not cp:
        raise HTTPException(status_code=400, detail="Not enrolled in this course")

    existing_lc = None
    for lc in LessonCompletion.objects().all():
        if lc.course_progress_id == cp.id and lc.lesson_id == lesson_id:
            existing_lc = lc
            break

    is_first_completion = existing_lc is None
    xp_earned = int(lesson.xp_reward * float(lesson.difficulty_multiplier) * max(score / 100.0, 0.2))

    if existing_lc:
        existing_lc.score = score
        existing_lc.attempts += 1
        existing_lc.time_spent_seconds += time_spent
        existing_lc.answers = answers
        existing_lc.xp_earned = xp_earned
        await LessonCompletion.objects().update(existing_lc)
    else:
        await LessonCompletion.objects().create(
            course_progress_id=cp.id, lesson_id=lesson_id, score=score, attempts=attempts,
            time_spent_seconds=time_spent, xp_earned=xp_earned, answers=answers,
        )

    if is_first_completion:
        cp.lessons_completed_count += 1

    cp.last_accessed_at = iso_now()

    # Update course average score
    completions = [lc for lc in LessonCompletion.objects().all() if lc.course_progress_id == cp.id]
    if completions:
        cp.total_score = float(sum(c.score for c in completions) / len(completions))

    # Check course completion
    total_lessons = len([l for l in Lesson.objects().all() if l.course_id == course_id and l.is_published])
    if cp.lessons_completed_count >= total_lessons and not cp.is_completed:
        cp.is_completed = True
        course = Course.objects().get(id=course_id)
        if course:
            user.add_xp(int(course.xp_reward))
            await notify_user(
                user.id, "course_completed", f"Course Completed: {course.title}",
                message=f"You've finished all lessons in {course.title}. Claim your certificate!",
                data={"course_id": course.id, "course_title": course.title},
            )

    await CourseProgress.objects().update(cp)

    leveled_up, new_level = user.add_xp(xp_earned)
    
    if leveled_up:
        await notify_user(
            user.id, "level_up", f"Level Up! You're now level {new_level}!",
            message=f"Keep going — you've reached level {new_level}.",
            data={"new_level": new_level},
        )
    
    # Auto-check achievements after XP gain
    newly_unlocked = []
    all_achievements = [a for a in Achievement.objects().all() if a.is_active]
    for ach in all_achievements:
        if ach.id in user.achievement_ids:
            continue
        rule = ach.rule_definition or {}
        should_award = False
        
        if rule.get("type") == "level_reached" and user.level >= rule.get("level", 999):
            should_award = True
        elif rule.get("type") == "streak_reached" and user.streak_current >= rule.get("streak_days", 999):
            should_award = True
        elif rule.get("type") == "total_xp_reached" and user.total_xp_earned >= rule.get("xp_threshold", float("inf")):
            should_award = True
        
        if should_award:
            user.achievement_ids.append(ach.id)
            user.add_xp(ach.xp_reward)
            newly_unlocked.append({"id": ach.id, "title": ach.title, "rarity": ach.rarity})

    await User.objects().update(user)

    return LessonCompletionResponse(
        message="Lesson completed",
        xp_earned=xp_earned,
        score=float(cp.total_score),
        is_first_completion=is_first_completion,
        lessons_completed=cp.lessons_completed_count,
        course_completed=cp.is_completed,
        leveled_up=leveled_up,
        new_level=new_level if leveled_up else user.level,
    )


@router.get("/my-progress", response_model=list[CourseProgressItem])
async def my_course_progress(user: CurrentUser):
    cps = [cp for cp in CourseProgress.objects().all() if cp.user_id == user.id]
    result = []
    for cp in sorted(cps, key=lambda x: x.last_accessed_at, reverse=True):
        course = Course.objects().get(id=cp.course_id)
        if course:
            result.append(CourseProgressItem(
                progress_id=cp.id, course_id=cp.course_id, slug=course.slug, title=course.title,
                category=course.category, lessons_completed=cp.lessons_completed_count,
                average_score=float(cp.total_score), is_completed=cp.is_completed,
                last_accessed_at=cp.last_accessed_at,
            ))
    return result


@router.get("/{course_id}/progress")
async def get_course_progress(course_id: int, user: CurrentUser):
    cp = None
    for p in CourseProgress.objects().all():
        if p.user_id == user.id and p.course_id == course_id:
            cp = p
            break

    if not cp:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")

    completed_ids = [lc.lesson_id for lc in LessonCompletion.objects().all() if lc.course_progress_id == cp.id]

    return {
        "progress_id": cp.id,
        "course_id": course_id,
        "lessons_completed": cp.lessons_completed_count,
        "average_score": float(cp.total_score),
        "is_completed": cp.is_completed,
        "completed_lesson_ids": completed_ids,
    }


@router.get("/search")
async def search_courses(
    q: str | None = Query(None, min_length=2),
    category: str | None = Query(None),
    difficulty: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    """Full-text search across courses by title, description, tags."""
    if not q:
        return []

    query = q.lower()
    results = []
    
    for c in Course.objects().all():
        if not c.is_published:
            continue
        
        searchable = f"{c.title} {c.description} {c.subject} {' '.join(c.tags)}".lower()
        
        # Match full words or partial matches with decent specificity (4+ chars)
        match_words = [w for w in query.split() if len(w) >= 4 and w in searchable]
        if not match_words:
            continue
        
        # Calculate relevance score
        score = 0
        title_lower = c.title.lower()
        desc_lower = (c.description or "").lower()
        
        for word in match_words:
            if word in title_lower:
                score += 3  # title match is most relevant
            if word in desc_lower:
                score += 1
        
        # Apply filters
        if category and c.category != category:
            continue
        if difficulty and c.difficulty != difficulty:
            continue
        
        results.append({
            "id": c.id, "slug": c.slug, "title": c.title,
            "description": (c.description or "")[:200],
            "category": c.category, "difficulty": c.difficulty,
            "xp_reward": c.xp_reward, "relevance_score": score,
        })
    
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results[:limit]

