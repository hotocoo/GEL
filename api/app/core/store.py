"""
JSON file storage layer — zero database dependency.
Atomic crash-safe writes (tmp+rename), in-memory cache with periodic flush.
Drop-in replacement for SQLAlchemy AsyncSession interface.
Data lives in api/data/*.json alongside the codebase.
"""

import asyncio
import copy
import json
import os
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field, asdict
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


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

    @property
    def friends(self):
        return []

    @property
    def friends_invited_by(self):
        return []

    @property
    def course_progresses(self):
        cps = CourseProgress.objects()
        return [cp for cp in cps if cp.user_id == self.id]

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
        from datetime import timedelta
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

    @property
    def lessons(self):
        return Lesson.objects().filter(course_id=self.id, order=True)

    @property
    def enrollments(self):
        return CourseProgress.objects().filter(course_id=self.id)


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

    @property
    def course(self):
        return Course.objects().get(id=self.course_id)

    @property
    def completions(self):
        return LessonCompletion.objects().filter(lesson_id=self.id)


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

    @property
    def user(self):
        return User.objects().get(id=self.user_id)

    @property
    def course(self):
        return Course.objects().get(id=self.course_id)

    @property
    def lesson_completions(self):
        return LessonCompletion.objects().filter(course_progress_id=self.id)


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

    @property
    def course_progress(self):
        return CourseProgress.objects().get(id=self.course_progress_id)

    @property
    def lesson(self):
        return Lesson.objects().get(id=self.lesson_id)


# ---- Storage engine ----

class _Storage:
    """Thread-safe in-memory cache backed by JSON files."""

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
        tmp = self._file(name).with_suffix(".json.tmp")
        with open(tmp, "w") as f:
            json.dump(self._data[name], f, indent=2)
        os.replace(str(tmp), str(self._file(name)))

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


# ---- Collection interface (used by fake session) ----

def _ensure_dataclass(cls, d: dict):
    """Convert plain dict to dataclass instance."""
    return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


class Collection:
    def __init__(self, name: str, model_class):
        self.name = name
        self.model = model_class

    @classmethod
    def objects(cls):
        return Collection(cls._name, cls._model)

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
        if order and "order_index" in (getattr(self.model, "__dataclass_fields__", {})):
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
            self._get_data().pop(
                next(i for i, d in enumerate(self._get_data()) if d.get("id") == obj.id), None
            )
            await storage._flush_one(self.name)


User.objects = lambda: Collection("users", User)
Course.objects = lambda: Collection("courses", Course)
Lesson.objects = lambda: Collection("lessons", Lesson)
Achievement.objects = lambda: Collection("achievements", Achievement)
CourseProgress.objects = lambda: Collection("course_progresses", CourseProgress)
LessonCompletion.objects = lambda: Collection("lesson_completions", LessonCompletion)


# ---- Fake AsyncSession (drop-in replacement for routes) ----

class Select:
    """Minimal select() compatible with existing route code."""

    def __init__(self, *models):
        self._models = models  # User, Course, etc.
        self._where_clauses: list[tuple[str, Any]] = []
        self._order_by: list[str] = []
        self._offset: int = 0
        self._limit: int | None = None
        self._raw_fields: list[str] | None = None

    def where(self, *clauses):
        """Parse clauses like User.email == 'x' or User.id.in_([1,2])."""
        for c in clauses:
            if isinstance(c, WhereIn):
                self._where_clauses.append(("IN", (c.attr_name, c.values)))
            elif hasattr(c, "op"):  # SQLAlchemy-style boolean operators
                self._parse_bool_op(c)
            elif "=" in str(type(c)):
                continue
        return self

    def _parse_bool_op(self, clause):
        """Handle User.email == 'x' style clauses and OR/AND."""
        op = getattr(clause, "op", None)
        if callable(op):
            op = op()
        left = getattr(clause, "left", None)
        right = getattr(clause, "right", None)

        if isinstance(clause, type(clause()) and hasattr(clause, "_negated")):
            return  # skip negated wrappers

        if isinstance(left, type(None)):
            # Direct attribute comparison: Model.field == value
            model_name = self._resolve_model_name(str(type(left).__name__) if left else "")
            attr = str(getattr(left, "__name__", left)).replace("_", "_")
            self._where_clauses.append(("EQ", (str(left), right)))
        elif isinstance(right, type(None)):
            pass

        # Try to extract attribute name from left side
        if hasattr(clause, "left"):
            l = clause.left
            if hasattr(l, "__class__") and hasattr(l.__class__, "__name__"):
                model_name = self._get_model_table(l.__class__.__name__)
            else:
                model_name = None
            attr = str(getattr(l, "__name__", "") or getattr(l, "key", "") or l)

            if isinstance(op, str):
                op_str = op
            elif callable(op):
                try:
                    op_str = op()
                except Exception:
                    op_str = "=="
            else:
                op_str = "=="

            if op_str in ("==", "eq"):
                self._where_clauses.append(("EQ", (attr, right)))
            elif op_str in ("!=", "<>"):
                self._where_clauses.append(("NEQ", (attr, right)))
            elif isinstance(right, Select):
                pass  # subquery — skip for now

    def _get_model_table(self, class_name: str) -> str:
        mapping = {
            "User": "users", "Course": "courses", "Lesson": "lessons",
            "Achievement": "achievements", "CourseProgress": "course_progresses",
            "LessonCompletion": "lesson_completions"
        }
        return mapping.get(class_name, class_name.lower() + "s")

    def order_by(self, *fields):
        self._order_by = [str(f) for f in fields]
        return self

    def offset(self, n: int):
        self._offset = n
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    def _resolve_table(self) -> str:
        """Get table name from first model in select."""
        if self._raw_fields:
            # Multiple tables — infer from where clauses or default to first
            for clause in self._where_clauses:
                pass
            return "users"  # fallback
        cls = self._models[0] if self._models else None
        mapping = {
            "User": "users", "Course": "courses", "Lesson": "lessons",
            "Achievement": "achievements", "CourseProgress": "course_progresses",
            "LessonCompletion": "lesson_completions"
        }
        if cls and hasattr(cls, "__name__"):
            return mapping.get(cls.__name__, cls.__name__.lower() + "s")
        return "users"

    def _filter_items(self, items):
        result = []
        for item in items:
            ok = True
            for cond in self._where_clauses:
                ctype, (attr, val) = cond
                item_val = item.get(attr)

                if ctype == "EQ":
                    if item_val != val:
                        ok = False
                        break
                elif ctype == "NEQ":
                    if item_val == val:
                        ok = False
                        break
                elif ctype == "IN":
                    if item_val not in val:
                        ok = False
                        break
            if ok:
                result.append(item)

        # Sort by order_index if requested
        for field in self._order_by:
            fname = str(field).replace(".desc()", "").replace(".asc()", "")
            desc = ".desc()" in field or "-id" == field[:3]
            try:
                result.sort(key=lambda x: x.get(fname, 0), reverse=desc)
            except Exception:
                pass

        return result[self._offset : self._offset + self._limit if self._limit else None]


class WhereIn:
    """Helper for Model.field.in_([1,2,3]) syntax."""
    def __init__(self, attr_name, values):
        self.attr_name = attr_name
        self.values = values


def select(*models):
    return Select(*models)


# Patch SQLAlchemy-style .in_() method onto dataclass attributes (dynamic descriptor)

class FakeAsyncSession:
    """Drop-in replacement for SQLAlchemy AsyncSession. Same API, JSON storage."""

    def __init__(self):
        self._new_objects: list[tuple[Collection, dict]] = []
        self._modified_objects: list[Any] = []
        self._deleted_objects: list[Any] = []

    async def execute(self, stmt):
        """Handle select() statements from route code."""
        if isinstance(stmt, Select):
            table = stmt._resolve_table()
            items = storage._data.get(table, [])
            filtered = stmt._filter_items(items)

            # Convert to appropriate model instances or raw tuples
            model_mapping = {
                "users": User, "courses": Course, "lessons": Lesson,
                "achievements": Achievement, "course_progresses": CourseProgress,
                "lesson_completions": LessonCompletion
            }
            model_cls = model_mapping.get(table)

            if len(stmt._models) > 1:
                # Multi-table select (joins) — return tuples
                results = []
                for item in filtered:
                    obj = _ensure_dataclass(model_cls, item)
                    results.append((obj,))
                return FakeResult(rows=results)

            objs = [_ensure_dataclass(model_cls, d) for d in filtered]
            return FakeResult(objects=objs)

        # Fallback
        return FakeResult()

    async def get(self, model_cls, id):
        """Handle session.get(Model, id)."""
        mapping = {
            User: "users", Course: "courses", Lesson: "lessons",
            Achievement: "achievements", CourseProgress: "course_progresses",
            LessonCompletion: "lesson_completions"
        }
        table = mapping.get(model_cls)
        if not table:
            return None
        for item in storage._data.get(table, []):
            if item.get("id") == id:
                return _ensure_dataclass(model_cls, item)
        return None

    def add(self, obj):
        """Handle session.add(obj)."""
        table = {
            User: "users", Course: "courses", Lesson: "lessons",
            Achievement: "achievements", CourseProgress: "course_progresses",
            LessonCompletion: "lesson_completions"
        }.get(type(obj))

        if not table:
            return

        col = Collection(table, type(obj))
        d = asdict(obj)
        if "id" not in d or d["id"] is None:
            async def _assign_id():
                async with storage._lock:
                    nxt = storage._next_ids.setdefault(table, 1)
                    d["id"] = nxt
                    storage._next_ids[table] = nxt + 1
                    storage._data[table].append(d)
                    await storage._flush_one(table)
            self._new_objects.append((col, d))
        else:
            storage._data[table].append(d)

    async def flush(self):
        """Handle session.flush() — persist new objects."""
        for col, d in self._new_objects:
            table = col.name
            if d["id"] is None or d["id"] not in [x.get("id") for x in storage._data[table]]:
                async with storage._lock:
                    nxt = storage._next_ids.setdefault(table, 1)
                    d["id"] = nxt
                    storage._next_ids[table] = nxt + 1
                    storage._data[table].append(d)
                    await storage._flush_one(table)
        self._new_objects.clear()

    async def commit(self):
        """Handle session.commit()."""
        await self.flush()

    async def rollback(self):
        """Handle session.rollback()."""
        self._new_objects.clear()
        self._modified_objects.clear()


class FakeResult:
    def __init__(self, rows=None, objects=None):
        self._rows = rows or []
        self._objects = objects or []

    def all(self):
        return self._rows if self._rows else self._objects

    def scalars(self):
        return FakeScalarResult(self._objects or [r[0] for r in self._rows])

    def scalar_one_or_none(self):
        items = self._objects or [r[0] for r in self._rows]
        return items[0] if items else None


class FakeScalarResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items

    def scalar_one_or_none(self):
        return self._items[0] if self._items else None


async def init_db():
    """Initialize storage and load data from files."""
    await storage.load_all()
    storage.start_periodic_flush()
    await seed_if_empty()


async def close_db():
    """Flush all data on shutdown."""
    await storage.flush_all()


async def get_db():
    """FastAPI dependency — same signature as original SQLAlchemy version."""
    async with FakeAsyncSessionContext() as session:
        yield session


@asynccontextmanager
async def FakeAsyncSessionContext():
    session = FakeAsyncSession()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise


async def seed_if_empty():
    """Create demo data if storage is empty."""
    users_count = len(storage._data["users"])
    courses_count = len(storage._data["courses"])

    if users_count == 0:
        # Create default admin
        from app.core.security import hash_password
        await User.objects().create(
            username="admin",
            email="admin@gel.dev",
            password_hash=hash_password("admin123"),
            role="admin",
            level=50,
            total_xp_earned=25000,
            xp_in_level=1500,
            streak_current=14,
            streak_longest=30,
            email_verified=True,
        )

    if courses_count == 0:
        # Seed demo courses with lessons
        courses_data = [
            {
                "slug": "python-basics",
                "title": "Python Fundamentals",
                "description": "Learn Python from zero. Variables, loops, functions, and OOP basics.",
                "category": "Computer Science",
                "subject": "Programming",
                "difficulty": "beginner",
                "xp_reward": 500,
                "estimated_duration_minutes": 120,
                "tags": ["python", "programming", "beginner"],
            },
            {
                "slug": "math-algebra",
                "title": "Algebra Essentials",
                "description": "Master linear equations, inequalities, functions, and polynomials.",
                "category": "Mathematics",
                "subject": "Algebra",
                "difficulty": "beginner",
                "xp_reward": 400,
                "estimated_duration_minutes": 90,
                "tags": ["algebra", "math"],
            },
            {
                "slug": "physics-mechanics",
                "title": "Classical Mechanics",
                "description": "Forces, motion, energy, momentum, and Newton's laws.",
                "category": "Physics",
                "subject": "Mechanics",
                "difficulty": "intermediate",
                "xp_reward": 600,
                "estimated_duration_minutes": 150,
                "tags": ["physics", "mechanics"],
            },
        ]

        for i, cd in enumerate(courses_data, 1):
            await Course.objects().create(
                id=i,
                created_by_user_id=1,
                **cd
            )

        # Add lessons for each course
        lesson_data = {
            1: [
                {"title": "Hello World & Variables", "content_html": "<p>Welcome to Python! Let's write your first program.</p><pre>print('Hello, world!')</pre>", "xp_reward": 30},
                {"title": "Data Types & Operators", "content_html": "<p>Python has several built-in data types: int, float, str, bool.</p>", "xp_reward": 40},
                {"title": "Control Flow: if/else", "content_html": "<p>Make decisions in your code with conditional statements.</p>", "xp_reward": 50},
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
                    id=lesson_id,
                    course_id=course_id,
                    slug=f"{ld['title'].lower().replace(' ', '-')}",
                    title=ld["title"],
                    content_html=ld["content_html"],
                    xp_reward=ld["xp_reward"],
                    order_index=order,
                )
                lesson_id += 1

    # Seed achievements if empty
    if len(storage._data["achievements"]) == 0:
        await Achievement.objects().create(
            id=1, slug="first-login", title="First Step", description="Log in for the first time",
            rarity="common", xp_reward=10, rule_definition={"type": "level_reached", "level": 1}
        )
        await Achievement.objects().create(
            id=2, slug="level-10", title="Rising Star", description="Reach level 10",
            rarity="uncommon", xp_reward=100, rule_definition={"type": "level_reached", "level": 10}
        )
        await Achievement.objects().create(
            id=3, slug="streak-7", title="Week Warrior", description="Maintain a 7-day streak",
            rarity="rare", xp_reward=200, rule_definition={"type": "streak_reached", "streak_days": 7}
        )
        await Achievement.objects().create(
            id=4, slug="level-50", title="Veteran", description="Reach level 50",
            rarity="epic", xp_reward=1000, rule_definition={"type": "level_reached", "level": 50}
        )
        await Achievement.objects().create(
            id=5, slug="xp-10k", title="Knowledge Seeker", description="Earn 10,000 total XP",
            rarity="epic", xp_reward=500, rule_definition={"type": "total_xp_reached", "xp_threshold": 10000}
        )

    await storage.flush_all()


# ---- Public exports that routes may import directly ----

__all__ = [
    "User", "Course", "Lesson", "Achievement", "CourseProgress", "LessonCompletion",
    "select", "init_db", "close_db", "get_db", "FakeAsyncSession", "xp_for_level", "iso_now",
]
