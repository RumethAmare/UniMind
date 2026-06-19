from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.models import User
from app.db.session import get_session
from app.schemas.auth import TokenPair, TokenRefresh, UserCreate, UserLogin, UserRead
from app.services.auth import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenPair)
@limiter.limit(settings.rate_limit_auth)
async def register(request: Request, payload: UserCreate, session: AsyncSession = Depends(get_session)):
    return await AuthService(session).register(payload)


@router.post("/login", response_model=TokenPair)
@limiter.limit(settings.rate_limit_auth)
async def login(request: Request, payload: UserLogin, session: AsyncSession = Depends(get_session)):
    return await AuthService(session).login(payload)


@router.post("/refresh", response_model=TokenPair)
@limiter.limit(settings.rate_limit_auth)
async def refresh(request: Request, payload: TokenRefresh, session: AsyncSession = Depends(get_session)):
    return await AuthService(session).refresh(payload.refresh_token)


@router.get("/me", response_model=UserRead)
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
