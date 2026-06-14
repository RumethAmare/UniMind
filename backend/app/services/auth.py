import hashlib

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.repositories import TokenRepository, UserRepository
from app.schemas.auth import TokenPair, UserCreate, UserLogin


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = UserRepository(session)
        self.tokens = TokenRepository(session)

    async def register(self, payload: UserCreate) -> TokenPair:
        if await self.users.get_by_email(payload.email):
            raise AppError("Email already registered", status.HTTP_409_CONFLICT)
        user = await self.users.create(payload.email, payload.full_name, hash_password(payload.password))
        access = create_access_token(user.id)
        refresh = create_refresh_token(user.id)
        await self.tokens.store_refresh_token(user.id, token_hash(refresh))
        await self.session.commit()
        return TokenPair(access_token=access, refresh_token=refresh)

    async def login(self, payload: UserLogin) -> TokenPair:
        user = await self.users.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise AppError("Invalid email or password", status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            raise AppError("User is inactive", status.HTTP_403_FORBIDDEN)
        access = create_access_token(user.id)
        refresh = create_refresh_token(user.id)
        await self.tokens.store_refresh_token(user.id, token_hash(refresh))
        await self.session.commit()
        return TokenPair(access_token=access, refresh_token=refresh)

    async def refresh(self, refresh_token: str) -> TokenPair:
        current_hash = token_hash(refresh_token)
        if not await self.tokens.is_active(current_hash):
            raise AppError("Invalid refresh token", status.HTTP_401_UNAUTHORIZED)
        try:
            user_id = decode_token(refresh_token, "refresh")
        except ValueError as exc:
            raise AppError("Invalid refresh token", status.HTTP_401_UNAUTHORIZED) from exc
        await self.tokens.revoke(current_hash)
        access = create_access_token(user_id)
        refresh = create_refresh_token(user_id)
        await self.tokens.store_refresh_token(user_id, token_hash(refresh))
        await self.session.commit()
        return TokenPair(access_token=access, refresh_token=refresh)

