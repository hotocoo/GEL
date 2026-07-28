from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    role: str
    avatar_url: str
    level: int
    xp_in_level: int
    total_xp_earned: int
    streak_current: int
    streak_longest: int
    email_verified: bool


class UserPublic(UserBase):
    badges: list[str]
    achievements_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores allowed)")
        return v.lower()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ---- Course schemas ----

class LessonPublic(BaseModel):
    id: int
    slug: str
    title: str
    content_type: str = "text"
    xp_reward: int


class CourseListItem(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    category: str
    difficulty: str
    xp_reward: int
    estimated_duration_minutes: int


class CourseDetail(CourseListItem):
    subject: str
    lessons: list[LessonPublic]


class LessonContent(BaseModel):
    id: int
    slug: str
    title: str
    content_html: str
    content_type: str
    media_data: dict = {}
    questions: list = []
    xp_reward: int


class CourseProgressItem(BaseModel):
    progress_id: int
    course_id: int
    slug: str
    title: str
    category: str
    lessons_completed: int
    average_score: float
    is_completed: bool
    last_accessed_at: str


class LessonCompletionResponse(BaseModel):
    message: str
    xp_earned: int
    score: float
    is_first_completion: bool
    lessons_completed: int
    course_completed: bool
    leveled_up: bool
    new_level: int


# ---- Gamification schemas ----

class LeaderboardEntry(BaseModel):
    rank: int
    id: int
    username: str
    level: int
    total_xp_earned: int
    streak_current: int
    avatar_url: str = ""


class LeaderboardResponse(BaseModel):
    leaderboard: list[LeaderboardEntry]


class AchievementPublic(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    achievement_type: str
    rarity: str
    icon_url: str = ""
    xp_reward: int


class UserStatsResponse(BaseModel):
    user_id: int
    level: int
    xp_in_level: int
    xp_to_next_level: int
    level_progress_percent: int
    total_xp_earned: int
    streak_current: int
    streak_longest: int
    achievements_count: int
    badges: list[str]


class StreakBonusResponse(BaseModel):
    message: str
    xp_awarded: int
    streak_current: int
    leveled_up: bool


class CertificateData(BaseModel):
    recipient: str
    course_title: str
    course_category: str
    completion_date: str
    average_score: float
    lessons_completed: int


class CourseCertificateResponse(BaseModel):
    certificate: CertificateData


# ---- Admin schemas ----

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_courses: int
    published_courses: int
    total_achievements: int
    top_user: dict | None = None


class AdminUserItem(BaseModel):
    id: int
    username: str
    email: str
    role: str
    level: int
    total_xp_earned: int
    is_active: bool
    created_at: str


class AdminUsersListResponse(BaseModel):
    users: list[AdminUserItem]


class CourseAdminItem(BaseModel):
    id: int
    slug: str
    title: str
    category: str
    difficulty: str
    is_published: bool
    created_at: str


class GenericMessageResponse(BaseModel):
    message: str

