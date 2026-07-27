# GEL — Gamified Learning Platform v2.0

RPG-style learning platform with XP, levels, achievements, streaks, and leaderboards.

## Tech Stack

### Backend: Python FastAPI (/api/)
- FastAPI async + SQLAlchemy 2.0 + PostgreSQL  
- JWT auth (access/refresh tokens via HTTP-only cookies)
- Alembic migrations, rate limiting, OpenAPI docs at `/docs`
- Exponential XP curve scales to level 200+

### Frontend: Next.js (/web/)
- Next.js 15 App Router + TypeScript
- TailwindCSS + Framer Motion  
- Zustand for auth state, TanStack Query ready
- Dark RPG theme with glass cards and animations

## Quick Start (Local)

Prerequisites: PostgreSQL running on localhost:5432 (or Docker), Python 3.12+, Node.js

### Database Setup
```bash
psql -U postgres -c "CREATE USER gel WITH PASSWORD 'gel_dev' SUPERUSER;"
psql -U postgres -c "CREATE DATABASE gel_dev OWNER gel;"
```

### Backend
```bash
cd api
export DB_URL="postgresql+asyncpg://gel:gel_dev@localhost:5432/gel_dev"
uv sync --all-extras        # or pip install -e .[dev]
uv run uvicorn app.main:app --port 8000
```

Open http://localhost:8000/docs for Swagger UI.

### Frontend  
```bash
cd web
npm install
npm run dev                 # http://localhost:3000
```

## API Endpoints (v1)

Auth:
- POST /api/v1/auth/signup — register user, returns JWT
- POST /api/v1/auth/login — login with email/password
- GET  /api/v1/auth/me — current user profile
- POST /api/v1/auth/logout

Gamification:  
- GET  /api/v1/gamification/leaderboard?limit=50
- GET  /api/v1/gamification/user-stats
- GET  /api/v1/gamification/achievements
- GET  /api/v1/gamification/user-achievements
- POST /api/v1/gamification/check-achievements

Courses:
- GET  /api/v1/courses?category=&difficulty=&limit=20&offset=0
- GET  /api/v1/courses/:id  
- POST /api/v1/courses/:id/enroll
- GET  /api/v1/courses/:id/lessons/:lesson_id
- POST /api/v1/courses/:id/lessons/:lesson_id/complete

## Project Structure

```
GEL/
├── api/                      # Python FastAPI backend
│   ├── app/main.py           # App factory
│   ├── app/core/             # Config, DB, security
│   ├── app/models/           # SQLAlchemy models  
│   ├── app/routes/           # API endpoints
│   ├── app/schemas/          # Pydantic schemas
│   ├── tests/                # pytest test suite
│   ├── pyproject.toml        # Python deps (uv)
│   └── alembic.ini           # DB migrations config
├── web/                      # Next.js frontend
│   ├── app/                  # App Router pages
│   ├── components/           # Shared UI components  
│   ├── store/                # Zustand stores
│   ├── lib/api.ts            # Axios client
│   └── types/api.ts          # TypeScript API types
├── backend-legacy/           # Original Express/MongoDB code
└── frontend-legacy/          # Original CRA+MUI code  
```

## Architecture Notes

### XP System
Exponential curve: `xp_for_level(n) = int(500 * 1.12^(n-1))`
Scales properly from level 1 to 200+ unlike old linear formula.

### Achievement Engine
Rule-based checking in `/gamification/check-achievements`:
- `level_reached`, `streak_reached`, `total_xp_reached` rule types
- Extensible — add new rule types for custom conditions  
- Stored as JSONB in Achievement.rule_definition column

### Auth Flow  
- JWT access token (1h) + refresh token (7d) 
- Optional HTTP-only cookie support or Authorization header
- bcrypt round 12, passwords minimum 8 characters

## Testing

Backend: `cd api && uv run pytest`  
Frontend: `cd web && npm run build` (TypeScript check included)
