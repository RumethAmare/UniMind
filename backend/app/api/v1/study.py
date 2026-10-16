from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.models import User
from app.db.session import get_session
from app.domain.enums import ArtifactType
from app.schemas.study import StudyArtifactRead, StudyArtifactSummary, StudyRequest
from app.services.study import StudyService

router = APIRouter()


@router.get("/artifacts", response_model=list[StudyArtifactSummary])
async def list_artifacts(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await StudyService(session).list_artifacts(current_user.id)


@router.get("/artifacts/{artifact_id}", response_model=StudyArtifactRead)
async def get_artifact(
    artifact_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await StudyService(session).get_artifact(artifact_id, current_user.id)


@router.delete("/artifacts/{artifact_id}", status_code=204)
async def delete_artifact(
    artifact_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    await StudyService(session).delete_artifact(artifact_id, current_user.id)


async def _generate(
    artifact_type: ArtifactType,
    payload: StudyRequest,
    current_user: User,
    session: AsyncSession,
) -> StudyArtifactRead:
    title = payload.title or artifact_type.replace("_", " ").title()
    return await StudyService(session).generate(
        user_id=current_user.id,
        artifact_type=artifact_type,
        title=title,
        course_id=payload.course_id,
        document_id=payload.document_id,
    )


@router.post("/summary", response_model=StudyArtifactRead)
@limiter.limit(settings.rate_limit_ai)
async def summary(
    request: Request,
    payload: StudyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await _generate(ArtifactType.SUMMARY, payload, current_user, session)


@router.post("/flashcards", response_model=StudyArtifactRead)
@limiter.limit(settings.rate_limit_ai)
async def flashcards(
    request: Request,
    payload: StudyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await _generate(ArtifactType.FLASHCARDS, payload, current_user, session)


@router.post("/mcqs", response_model=StudyArtifactRead)
@limiter.limit(settings.rate_limit_ai)
async def mcqs(
    request: Request,
    payload: StudyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await _generate(ArtifactType.MCQS, payload, current_user, session)


@router.post("/guide", response_model=StudyArtifactRead)
@limiter.limit(settings.rate_limit_ai)
async def study_guide(
    request: Request,
    payload: StudyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await _generate(ArtifactType.STUDY_GUIDE, payload, current_user, session)
