"""Admin-only routes requiring admin role."""
from fastapi import APIRouter, HTTPException, status
from app.core.deps import AdminUser
from app.core.store import User, Course, Lesson, Achievement, iso_now
from app.schemas.auth import (
    AdminStatsResponse, AdminUsersListResponse, AdminUserItem,
    CourseAdminItem, GenericMessageResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsResponse)
async def admin_stats(user: AdminUser):
    """System-wide statistics for dashboard."""
    all_users = User.objects().all()
    all_courses = Course.objects().all()
    all_achievements = Achievement.objects().all()

    top_user_obj = max((u for u in all_users if u.total_xp_earned > 0),
                       key=lambda u: u.total_xp_earned, default=None)

    return AdminStatsResponse(
        total_users=len(all_users),
        active_users=len([u for u in all_users if u.is_active]),
        total_courses=len(all_courses),
        published_courses=len([c for c in all_courses if c.is_published]),
        total_achievements=len(all_achievements),
        top_user=({"username": top_user_obj.username, "total_xp": int(top_user_obj.total_xp_earned)}
                  if top_user_obj else None),
    )


@router.get("/users", response_model=AdminUsersListResponse)
async def list_admin_users(
    user: AdminUser,
    limit: int = 100,
    offset: int = 0,
):
    """List all users for admin management."""
    users = User.objects().all()
    users.sort(key=lambda u: u.created_at, reverse=True)
    users = users[offset : offset + limit]

    return AdminUsersListResponse(
        users=[
            AdminUserItem(
                id=u.id, username=u.username, email=u.email, role=u.role,
                level=u.level, total_xp_earned=int(u.total_xp_earned),
                is_active=u.is_active, created_at=u.created_at
            )
            for u in users
        ]
    )


@router.put("/users/{user_id}", response_model=GenericMessageResponse)
async def update_admin_user(
    user: AdminUser, user_id: int, data: dict,
):
    """Update any user's settings (role, status)."""
    target = User.objects().get(id=user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    allowed_fields = {"role", "is_active"}
    for field in allowed_fields:
        if field in data:
            setattr(target, field, data[field])

    target.updated_at = iso_now()
    await User.objects().update(target)
    return GenericMessageResponse(message=f"User {user_id} updated")


@router.delete("/users/{user_id}", response_model=GenericMessageResponse)
async def deactivate_user(
    user: AdminUser, user_id: int,
):
    """Soft-delete a user (set is_active=False)."""
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    target = User.objects().get(id=user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.is_active = False
    target.updated_at = iso_now()
    await User.objects().update(target)
    return GenericMessageResponse(message=f"User {user_id} deactivated")


@router.get("/courses", response_model=list[CourseAdminItem])
async def list_admin_courses(user: AdminUser):
    """List all courses including drafts."""
    courses = Course.objects().all()
    return [
        CourseAdminItem(
            id=c.id, slug=c.slug, title=c.title, category=c.category,
            difficulty=c.difficulty, is_published=c.is_published, created_at=c.created_at
        )
        for c in courses
    ]


@router.put("/courses/{course_id}", response_model=GenericMessageResponse)
async def update_course(user: AdminUser, course_id: int, data: dict):
    """Update course metadata."""
    course = Course.objects().get(id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    allowed_fields = {"title", "description", "category", "difficulty",
                      "xp_reward", "is_published", "order_index"}
    for field in allowed_fields:
        if field in data:
            setattr(course, field, data[field])

    course.updated_at = iso_now()
    await Course.objects().update(course)
    return GenericMessageResponse(message=f"Course {course_id} updated")


@router.post("/courses/{course_id}/lessons", response_model=dict)
async def create_lesson(user: AdminUser, course_id: int, lesson_data: dict):
    """Create a new lesson in a course."""
    course = Course.objects().get(id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    title = lesson_data.get("title", "").strip() or "Untitled Lesson"
    content_html = lesson_data.get("content_html", "")
    xp_reward = max(int(lesson_data.get("xp_reward", 25)), 1)

    lessons = [l for l in Lesson.objects().all() if l.course_id == course_id]
    order_index = len(lessons) + 1

    lesson = await Lesson.objects().create(
        course_id=course_id,
        slug=title.lower().replace(" ", "-"),
        title=title,
        content_html=content_html,
        xp_reward=xp_reward,
        order_index=order_index,
        questions=lesson_data.get("questions", []),
    )

    return {"message": "Lesson created", "lesson_id": lesson.id}


@router.put("/courses/{course_id}/lessons/{lesson_id}", response_model=GenericMessageResponse)
async def update_lesson(
    user: AdminUser, course_id: int, lesson_id: int, data: dict,
):
    """Update a lesson's content."""
    lesson = Lesson.objects().get(id=lesson_id)
    if not lesson or lesson.course_id != course_id:
        raise HTTPException(status_code=404, detail="Lesson not found")

    allowed_fields = {"title", "content_html", "xp_reward", "questions", "order_index"}
    for field in allowed_fields:
        if field in data:
            setattr(lesson, field, data[field])

    lesson.updated_at = iso_now()
    await Lesson.objects().update(lesson)
    return GenericMessageResponse(message=f"Lesson {lesson_id} updated")


@router.delete("/courses/{course_id}/lessons/{lesson_id}", response_model=GenericMessageResponse)
async def delete_lesson(user: AdminUser, course_id: int, lesson_id: int):
    """Delete a lesson."""
    lesson = Lesson.objects().get(id=lesson_id)
    if not lesson or lesson.course_id != course_id:
        raise HTTPException(status_code=404, detail="Lesson not found")

    await Lesson.objects().delete(lesson)
    return GenericMessageResponse(message=f"Lesson {lesson_id} deleted")
