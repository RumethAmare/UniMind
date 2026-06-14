from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.document import AskResponse


class RagQueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=5000)
    course_id: UUID | None = None
    document_id: UUID | None = None
    top_k: int | None = Field(default=None, ge=1, le=20)


class RagQueryResponse(AskResponse):
    pass
