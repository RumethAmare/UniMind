from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.document import AskResponse, SourceCitation


class ChatSessionCreate(BaseModel):
    course_id: UUID | None = None
    title: str = Field(default="New chat", min_length=1, max_length=255)


class ChatSessionRead(BaseModel):
    id: UUID
    course_id: UUID | None
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=5000)
    top_k: int | None = Field(default=None, ge=1, le=20)


class ChatMessageRead(BaseModel):
    id: UUID
    role: str
    content: str
    confidence_score: float | None
    sources: list[SourceCitation] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatAskResponse(AskResponse):
    session_id: UUID
    user_message_id: UUID
    assistant_message_id: UUID

