from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.models import User
from app.db.session import get_session
from app.schemas.rag import RagQueryRequest, RagQueryResponse
from app.services.rag import RagService

router = APIRouter()


@router.post("/query", response_model=RagQueryResponse)
@limiter.limit(settings.rate_limit_ai)
async def query(
    request: Request,
    payload: RagQueryRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await RagService(session).answer(
        user_id=current_user.id,
        question=payload.question,
        course_id=payload.course_id,
        document_id=payload.document_id,
        top_k=payload.top_k,
    )
