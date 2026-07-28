from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from app.core.store import User
from .security import decode_token


async def get_current_user(request: Request) -> User:
    auth_header = request.headers.get("Authorization", "")
    cookie_token = request.cookies.get("access_token")

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif cookie_token:
        token = cookie_token
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = int(payload.get("sub"))
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = User.objects().get(id=user_id, is_active=True)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_role(*allowed_roles: str):
    async def role_checker(user: CurrentUser) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return role_checker


AdminUser = Annotated[User, Depends(require_role("admin"))]
StaffUser = Annotated[User, Depends(require_role("admin", "teacher"))]
