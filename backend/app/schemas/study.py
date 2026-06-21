from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class StudyRequest(BaseModel):
    course_id: UUID | None = None
    document_id: UUID | None = None
    title: str | None = Field(default=None, max_length=255)


class StudyArtifactSummary(BaseModel):
    id: UUID
    artifact_type: str
    title: str
    course_id: UUID | None
    document_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class StudyArtifactRead(StudyArtifactSummary):
    content: dict
