from __future__ import annotations

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import get_settings
from app.core.store import init_db, close_db


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title=settings.app_name, version="2.0.0", docs_url="/docs", redoc_url="/redoc")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_requests}/minute"])
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(_request: Request, exc: RateLimitExceeded):
        return Response(status_code=status.HTTP_429_TOO_MANY_REQUESTS, content='{"detail":"Rate limit exceeded"}', media_type="application/json")

    # Init data store on startup
    @app.on_event("startup")
    async def on_startup():
        await init_db()

    @app.on_event("shutdown")
    async def on_shutdown():
        await close_db()

    from app.routes.admin import router as admin_router
    from app.routes.auth import router as auth_router  # noqa: F401 PLC2701
    from app.routes.courses import router as courses_router  # noqa: F401 PLC2701
    from app.routes.gamification import router as gamification_router  # noqa: F401 PLC2701

    api_prefix = "/api/v1"
    app.include_router(admin_router, prefix=api_prefix)
    app.include_router(auth_router, prefix=api_prefix)
    app.include_router(courses_router, prefix=api_prefix)
    app.include_router(gamification_router, prefix=api_prefix)

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "env": settings.env}

    return app


app = create_app()
