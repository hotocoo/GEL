"""Dynamic configuration and feature flags."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.deps import CurrentUser

router = APIRouter(prefix="/config", tags=["config"])


async def require_admin(user: CurrentUser):
    """Require admin role."""
    from app.core.store import User as UserType
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class FeatureFlags(BaseModel):
    daily_quests_enabled: bool = True
    friends_enabled: bool = True
    notifications_enabled: bool = True
    achievements_enabled: bool = True
    course_certificates_enabled: bool = True
    search_enabled: bool = True
    streak_bonus_enabled: bool = True
    admin_panel_enabled: bool = True


class SystemConfig(BaseModel):
    app_name: str = "GEL - Gamified E-Learning"
    version: str = "0.5.2"
    maintenance_mode: bool = False
    registration_open: bool = True
    feature_flags: FeatureFlags = FeatureFlags()


# Default config — load from JSON file in production for dynamic updates
def get_config() -> SystemConfig:
    """Load system configuration."""
    try:
        import json
        from pathlib import Path
        DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
        fp = DATA_DIR / "system_config.json"
        if fp.exists():
            with open(fp) as f:
                data = json.load(f)
            return SystemConfig(**data)
    except Exception:
        pass

    return SystemConfig()


@router.get("")
async def get_system_config():
    """Get current system configuration (public)."""
    config = get_config()
    # Don't expose admin feature flags to public users
    flags = config.feature_flags.model_dump()
    flags.pop("admin_panel_enabled", None)

    return {
        "app_name": config.app_name,
        "version": config.version,
        "maintenance_mode": config.maintenance_mode,
        "registration_open": config.registration_open,
        "features": flags,
    }


@router.get("/full")
async def get_full_config(user: CurrentUser):
    """Get full configuration including admin flags (requires auth)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    """Get full configuration including admin flags (requires auth)."""
    from app.core.deps import AdminUser
    return {"config": get_config().model_dump()}



@router.get("/features/{feature_name}")
async def check_feature_flag(feature_name: str):
    """Check if a specific feature is enabled."""
    config = get_config()
    flags = config.feature_flags.model_dump()

    if feature_name not in flags:
        raise HTTPException(status_code=404, detail=f"Unknown feature: {feature_name}")

    return {"feature": feature_name, "enabled": bool(flags[feature_name])}
