from __future__ import annotations

import re

"""Auth endpoints — JSON file backend."""
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.deps import CurrentUser
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.core.store import User, iso_now
from app.schemas.auth import (
    UpdateUserProfileRequest,
    ChangePasswordRequest, LoginRequest, RefreshTokenRequest, SignupRequest, TokenResponse, UserPublic,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, samesite="lax", secure=False, max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, samesite="lax", secure=False, max_age=7 * 24 * 3600, path="/auth/refresh")


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest):
    for u in User.objects().all():
        if u.email == request.email.lower() or u.username == request.username.lower():
            raise HTTPException(status_code=400, detail="Email/username already registered")

    user = await User.objects().create(
        username=request.username.lower(),
        email=request.email.lower(),
        password_hash=hash_password(request.password),
    )

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)

    response = Response(
        content=TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserPublic.model_validate(user)).model_dump_json(),
        media_type="application/json", status_code=status.HTTP_201_CREATED,
    )
    _set_auth_cookies(response, access_token, refresh_token)
    return response


@router.post("/login")
async def login(request: LoginRequest):
    user = User.objects().get(email=request.email.lower())
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    user.update_streak()
    await User.objects().update(user)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)

    response = Response(
        content=TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserPublic.model_validate(user)).model_dump_json(),
        media_type="application/json",
    )
    _set_auth_cookies(response, access_token, refresh_token)
    return response


@router.post("/refresh")
async def refresh_endpoint(req: RefreshTokenRequest):
    try:
        payload = decode_token(req.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = int(payload["sub"])
    user = User.objects().get(id=user_id, is_active=True)
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserPublic.model_validate(user))


@router.get("/me", response_model=UserPublic)
async def get_me(user: CurrentUser):
    return UserPublic.model_validate(user)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/auth/refresh")
    return {"message": "Logged out successfully"}


@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, user: CurrentUser):
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(req.new_password)
    user.updated_at = iso_now()
    await User.objects().update(user)  # type: ignore[attr-defined]
    return {"message": "Password changed successfully"}


@router.post("/reset-password-request")
async def request_password_reset(body: dict):
    email = (body.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    user = User.objects().get(email=email)
    if user:
        user.generate_reset_token(ttl_hours=24)
        await User.objects().update(user)
        # TODO: send reset email
    return {"message": "If an account with that email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(body: dict):
    from datetime import datetime, timezone

    token = body.get("token", "")
    new_pw = body.get("new_password", "")
    if not token or not new_pw:
        raise HTTPException(status_code=400, detail="Token and new_password required")

    now_dt = datetime.now(timezone.utc)
    user = None
    for u in User.objects().all():
        if u.reset_token == token and u.reset_token_expires_at:
            expires = datetime.fromisoformat(u.reset_token_expires_at)
            if expires > now_dt:
                user = u
                break

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.password_hash = hash_password(new_pw)
    user.reset_token = None
    user.reset_token_expires_at = None
    await User.objects().update(user)
    return {"message": "Password has been reset"}

@router.put("/me/profile", response_model=UserPublic)
async def update_profile(data: UpdateUserProfileRequest, user: CurrentUser):
    """Update user profile settings."""
    allowed_fields = {"username", "avatar_url"}
    
    if "username" in data:
        new_username = (data["username"] or "").strip().lower()
        if not re.match(r'^[a-z0-9_]{3,32}$', new_username):
            raise HTTPException(status_code=400, detail="Invalid username format")
        for u in User.objects().all():
            if u.id != user.id and u.username == new_username:
                raise HTTPException(status_code=409, detail="Username already taken")
        user.username = new_username
    
    if "avatar_url" in data:
        user.avatar_url = str(data["avatar_url"])[:512] or ""
    
    user.updated_at = iso_now()
    await User.objects().update(user)
    return {"message": "Profile updated", "user": UserPublic.model_validate(user)}

