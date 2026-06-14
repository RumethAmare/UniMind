from uuid import UUID

from pydantic import BaseModel, Field


class StudyRequest(BaseModel):
    course_id: UUID | None = None
    document_id: UUID | None = None
    title: str | None = Field(default=None, max_length=255)


class StudyArtifactRead(BaseModel):
    id: UUID
    artifact_type: str
    title: str
    content: dict

    model_config = {"from_attributes": True}

