from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "extra": "ignore"}

    # App
    app_name: str = "Gamified Learning Platform"
    env: str = "development"

    # JWT
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_minutes: int = 60
    jwt_refresh_days: int = 7

    # Security
    bcrypt_rounds: int = 12

    # Rate limiting
    rate_limit_requests: int = 100

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
