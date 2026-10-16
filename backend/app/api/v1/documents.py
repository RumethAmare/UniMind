from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.models import User
from app.db.session import AsyncSessionLocal, get_session
from app.schemas.document import DocumentRead
from app.services.documents import DocumentIngestionService, DocumentService

router = APIRouter()
logger = structlog.get_logger(__name__)


async def process_document_task(document_id: UUID, user_id: UUID) -> None:
    async with AsyncSessionLocal() as session:
        await DocumentIngestionService(session).process(document_id, user_id)


@router.get("", response_model=list[DocumentRead])
async def list_documents(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await DocumentService(session).list_documents(current_user.id)


@router.post("/upload", response_model=DocumentRead, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    course_id: UUID | None = Form(default=None),
    session: AsyncSession = Depends(get_session),
):
    document = await DocumentService(session).upload(current_user.id, file, title, course_id)
    if not settings.ingest_inline:
        background_tasks.add_task(process_document_task, document.id, current_user.id)
        return document
    try:
        await process_document_task(document.id, current_user.id)
    except Exception:
        # Ingestion records the failure on the document; return it with that status.
        logger.exception("document_ingestion_failed", document_id=str(document.id))
    await session.refresh(document)
    return document


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    return await DocumentService(session).get_document(document_id, current_user.id)


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_session),
):
    await DocumentService(session).delete_document(document_id, current_user.id)

