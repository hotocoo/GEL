"""
JSON file storage layer — zero database dependency.
Atomic crash-safe writes (tmp+rename), in-memory cache with periodic flush.
Data lives in api/data/*.json alongside the codebase.
"""

from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
import logging

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
UTC = timezone.utc


def iso_now() -> str:
    return datetime.now(UTC).isoformat()


@dataclass
class User:
    id: int
    username: str
    email: str
    password_hash: str
    role: str = "student"
    avatar_url: str = ""
    level: int = 1
    xp_in_level: int = 0
    total_xp_earned: int = 0
    streak_current: int = 0
    streak_longest: int = 0
    last_activity_date: str | None = None
    achievement_ids: list[int] = field(default_factory=list)
    badges: list[str] = field(default_factory=list)
    email_verified: bool = False
    is_active: bool = True
    reset_token: str | None = None
    reset_token_expires_at: str | None = None
    created_at: str = field(default_factory=iso_now)
    updated_at: str = field(default_factory=iso_now)

    def add_xp(self, amount: int) -> tuple[bool, int]:
        if amount <= 0:
            return False, self.level
        original_level = self.level
        self.total_xp_earned += amount
        remaining = amount
        while remaining > 0:
            needed = xp_for_level(self.level)
            current_total = self.xp_in_level + remaining
            if current_total >= needed:
                consumed = needed - self.xp_in_level
                self.xp_in_level = current_total - needed
                remaining -= consumed
                self.level += 1
            else:
                self.xp_in_level = current_total
                remaining = 0
        leveled_up = self.level > original_level
        self.updated_at = iso_now()
        return leveled_up, self.level

    def update_streak(self):
        today = datetime.now(UTC).date()
        if not self.last_activity_date:
            self.streak_current = 1
            self.last_activity_date = iso_now()
            self.updated_at = iso_now()
            return
        last_dt = datetime.fromisoformat(self.last_activity_date)
        delta = (today - last_dt.date()).days
        if delta == 0:
            self.last_activity_date = iso_now()
            self.updated_at = iso_now()
            return
        elif delta == 1:
            self.streak_current += 1
        else:
            self.streak_current = 1
        if self.streak_current > self.streak_longest:
            self.streak_longest = self.streak_current
        self.last_activity_date = iso_now()
        self.updated_at = iso_now()

    def generate_reset_token(self, ttl_hours=24):
        import secrets
        self.reset_token = secrets.token_hex(32)
        self.reset_token_expires_at = (datetime.now(UTC) + timedelta(hours=ttl_hours)).isoformat()
        self.updated_at = iso_now()


def xp_for_level(level: int) -> int:
    return int(500 * (1.12 ** (level - 1)))


@dataclass
class Course:
    id: int
    slug: str
    title: str
    description: str = ""
    category: str = "General"
    subject: str = ""
    tags: list[str] = field(default_factory=list)
    difficulty: str = "beginner"
    xp_reward: int = 100
    estimated_duration_minutes: int = 60
    thumbnail_url: str = ""
    is_published: bool = True
    order_index: int = 0
    prerequisite_course_id: int | None = None
    created_by_user_id: int = 0
    created_at: str = field(default_factory=iso_now)
    updated_at: str = field(default_factory=iso_now)


@dataclass
class Lesson:
    id: int
    course_id: int
    slug: str
    title: str
    content_html: str = ""
    content_type: str = "text"
    media_data: dict = field(default_factory=dict)
    questions: list[dict] = field(default_factory=list)
    xp_reward: int = 25
    difficulty_multiplier: float = 1.0
    order_index: int = 0
    prerequisite_lesson_id: int | None = None
    is_published: bool = True
    created_at: str = field(default_factory=iso_now)
    updated_at: str = field(default_factory=iso_now)


@dataclass
class Achievement:
    id: int
    slug: str
    title: str
    description: str = ""
    achievement_type: str = "milestone"
    rarity: str = "common"
    icon_url: str = ""
    rule_definition: dict | None = None
    xp_reward: int = 50
    is_active: bool = True
    created_at: str = field(default_factory=iso_now)


@dataclass
class CourseProgress:
    id: int
    user_id: int
    course_id: int
    enrolled_at: str = field(default_factory=iso_now)
    last_accessed_at: str = field(default_factory=iso_now)
    lessons_completed_count: int = 0
    total_score: float = 0.0
    is_completed: bool = False


@dataclass
class LessonCompletion:
    id: int
    course_progress_id: int
    lesson_id: int
    completed_at: str = field(default_factory=iso_now)
    score: float = 0.0
    attempts: int = 1
    time_spent_seconds: int = 0
    xp_earned: int = 0
    answers: list[dict] = field(default_factory=list)


# ---- Storage engine ----

class _Storage:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._next_ids: dict[str, int] = {}
        self._data: dict[str, list[dict]] = {
            "users": [], "courses": [], "lessons": [],
            "achievements": [], "course_progresses": [],
            "lesson_completions": []
        }
        self._flush_task: asyncio.Task | None = None

    def _file(self, name: str) -> Path:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        return DATA_DIR / f"{name}.json"

    async def load_all(self):
        async with self._lock:
            for name in self._data:
                fp = self._file(name)
                if fp.exists():
                    try:
                        with open(fp, "r") as f:
                            items = json.load(f)
                        self._data[name] = items or []
                        ids = [i.get("id") for i in self._data[name] if isinstance(i.get("id"), int)]
                        self._next_ids[name] = max(ids, default=0) + 1
                    except Exception as e:
                        print(f"Warning: could not load {fp}: {e}")

    async def _flush_one(self, name: str):
        """Atomically flush one collection to disk."""
        try:
            tmp = self._file(name).with_suffix(".json.tmp")
            with open(tmp, "w") as f:
                json.dump(self._data[name], f, indent=2)
            os.replace(str(tmp), str(self._file(name)))
        except Exception:
            logger.exception("Flush failed for %s", name)
            raise

    async def flush_all(self):
        async with self._lock:
            for name in self._data:
                await self._flush_one(name)

    async def _periodic_flush(self):
        while True:
            await asyncio.sleep(2)
            try:
                await self.flush_all()
            except Exception as e:
                print(f"Flush error: {e}")

    def start_periodic_flush(self):
        if self._flush_task is None or self._flush_task.done():
            self._flush_task = asyncio.create_task(self._periodic_flush())


storage = _Storage()


# ---- Collection interface ----

def _ensure_dataclass(cls, d: dict):
    return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


class Collection:
    def __init__(self, name: str, model_class):
        self.name = name
        self.model = model_class

    def _get_data(self) -> list[dict]:
        return storage._data[self.name]

    def get(self, id=None, **kwargs):
        for item in self._get_data():
            if id is not None and item.get("id") != id:
                continue
            match = True
            for k, v in kwargs.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                return _ensure_dataclass(self.model, item)
        return None

    def all(self):
        return [_ensure_dataclass(self.model, d) for d in self._get_data()]

    def filter(self, order=False, **kwargs):
        result = []
        for item in self._get_data():
            if all(item.get(k) == v for k, v in kwargs.items()):
                result.append(_ensure_dataclass(self.model, item))
        if order and "order_index" in getattr(self.model, "__dataclass_fields__", {}):
            result.sort(key=lambda x: getattr(x, "order_index", 0))
        return result

    async def create(self, **kwargs):
        async with storage._lock:
            nxt = storage._next_ids.setdefault(self.name, 1)
            kwargs["id"] = nxt
            storage._next_ids[self.name] = nxt + 1
            entry = {k: v for k, v in kwargs.items()}
            storage._data[self.name].append(entry)
            await storage._flush_one(self.name)
        return self.get(id=nxt)

    async def update(self, obj):
        async with storage._lock:
            data = self._get_data()
            for i, d in enumerate(data):
                if d.get("id") == obj.id:
                    data[i] = asdict(obj)
                    break
            await storage._flush_one(self.name)

    async def delete(self, obj):
        async with storage._lock:
            data = self._get_data()
            idx = next((i for i, d in enumerate(data) if d.get("id") == obj.id), None)
            if idx is not None:
                data.pop(idx)
            await storage._flush_one(self.name)


User.objects = lambda: Collection("users", User)
Course.objects = lambda: Collection("courses", Course)
Lesson.objects = lambda: Collection("lessons", Lesson)
Achievement.objects = lambda: Collection("achievements", Achievement)
CourseProgress.objects = lambda: Collection("course_progresses", CourseProgress)
LessonCompletion.objects = lambda: Collection("lesson_completions", LessonCompletion)


async def init_db():
    await storage.load_all()
    storage.start_periodic_flush()
    await seed_if_empty()


async def close_db():
    await storage.flush_all()


async def seed_if_empty():
    from app.core.security import hash_password

    if len(storage._data["users"]) == 0:
        await User.objects().create(
            username="admin", email="admin@gel.dev",
            password_hash=hash_password("admin123"), role="admin",
            level=50, total_xp_earned=25000, xp_in_level=1500,
            streak_current=14, streak_longest=30, email_verified=True,
        )

    if len(storage._data["courses"]) == 0:
        courses_data = [
            {"slug": "python-basics", "title": "Python Fundamentals",
             "description": "Learn Python from zero. Variables, loops, functions, and OOP basics.",
             "category": "Computer Science", "subject": "Programming",
             "difficulty": "beginner", "xp_reward": 500, "estimated_duration_minutes": 120},
            {"slug": "math-algebra", "title": "Algebra Essentials",
             "description": "Master linear equations, inequalities, functions, and polynomials.",
             "category": "Mathematics", "subject": "Algebra",
             "difficulty": "beginner", "xp_reward": 400, "estimated_duration_minutes": 90},
            {"slug": "physics-mechanics", "title": "Classical Mechanics",
             "description": "Forces, motion, energy, momentum, and Newton's laws.",
             "category": "Physics", "subject": "Mechanics",
             "difficulty": "intermediate", "xp_reward": 600, "estimated_duration_minutes": 150},
        ]
        for i, cd in enumerate(courses_data, 1):
            await Course.objects().create(id=i, created_by_user_id=1, **cd)

        lesson_data = {
            1: [
                {"title": "Hello World & Variables", "content_html": "<p>Welcome to Python!</p><pre>print('Hello, world!')</pre>", "xp_reward": 30},
                {"title": "Data Types & Operators", "content_html": "<p>Python has several built-in data types.</p>", "xp_reward": 40},
                {"title": "Control Flow: if/else", "content_html": "<p>Make decisions in your code with conditionals.</p>", "xp_reward": 50},
            ],
            2: [
                {"title": "Linear Equations", "content_html": "<p>Solving ax + b = c for x.</p>", "xp_reward": 40},
                {"title": "Systems of Equations", "content_html": "<p>Multiple equations, multiple unknowns.</p>", "xp_reward": 50},
            ],
            3: [
                {"title": "Newton's Laws of Motion", "content_html": "<p>The three laws that govern all motion.</p>", "xp_reward": 60},
                {"title": "Energy & Work", "content_html": "<p>Conservation of energy in mechanical systems.</p>", "xp_reward": 70},
            ],
        }
        lesson_id = 1
        for course_id, lessons in lesson_data.items():
            for order, ld in enumerate(lessons, 1):
                await Lesson.objects().create(
                    id=lesson_id, course_id=course_id,
                    slug=ld["title"].lower().replace(" ", "-"), title=ld["title"],
                    content_html=ld["content_html"], xp_reward=ld["xp_reward"], order_index=order,
                )
                lesson_id += 1

    if len(storage._data["achievements"]) == 0:
        await Achievement.objects().create(
            id=1, slug="first-login", title="First Step", description="Log in for the first time",
            rarity="common", xp_reward=10, rule_definition={"type": "level_reached", "level": 1})
        await Achievement.objects().create(
            id=2, slug="level-10", title="Rising Star", description="Reach level 10",
            rarity="uncommon", xp_reward=100, rule_definition={"type": "level_reached", "level": 10})
        await Achievement.objects().create(
            id=3, slug="streak-7", title="Week Warrior", description="Maintain a 7-day streak",
            rarity="rare", xp_reward=200, rule_definition={"type": "streak_reached", "streak_days": 7})
        await Achievement.objects().create(
            id=4, slug="level-50", title="Veteran", description="Reach level 50",
            rarity="epic", xp_reward=1000, rule_definition={"type": "level_reached", "level": 50})
        await Achievement.objects().create(
            id=5, slug="xp-10k", title="Knowledge Seeker", description="Earn 10,000 total XP",
            rarity="epic", xp_reward=500, rule_definition={"type": "total_xp_reached", "xp_threshold": 10000})

    await storage.flush_all()


__all__ = [
    "User", "Course", "Lesson", "Achievement", "CourseProgress", "LessonCompletion",
    "init_db", "close_db", "xp_for_level", "iso_now", "Collection",
]
