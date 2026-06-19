from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentRead(BaseModel):
    id: UUID
    course_id: UUID | None
    title: str
    filename: str
    mime_type: str
    file_size_bytes: int
    status: str
    error_message: str | None
    page_count: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SourceCitation(BaseModel):
    document_name: str
    page_number: int | None
    chunk_id: UUID


class AskResponse(BaseModel):
    answer: str
    confidence_score: float
    sources: list[SourceCitation]

