from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.models import User
from app.db.session import get_session
from app.schemas.chat import AskRequest, ChatAskResponse, ChatMessageRead, ChatSessionCreate, ChatSessionRead
from app.services.chat import ChatService

router = APIRouter()


@router.post("/sessions", response_model=ChatSessionRead, status_code=201)
async def create_session(
    payload: ChatSessionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await ChatService(session).create_session(
        current_user.id, payload.course_id, payload.title, payload.document_ids
    )


@router.get("/sessions", response_model=list[ChatSessionRead])
async def list_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await ChatService(session).list_sessions(current_user.id)


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageRead])
async def list_messages(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await ChatService(session).list_messages(session_id, current_user.id)


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    await ChatService(session).delete_session(session_id, current_user.id)


@router.post("/sessions/{session_id}/ask", response_model=ChatAskResponse)
@limiter.limit(settings.rate_limit_ai)
async def ask(
    request: Request,
    session_id: UUID,
    payload: AskRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await ChatService(session).ask(session_id, current_user.id, payload.question, payload.top_k)
