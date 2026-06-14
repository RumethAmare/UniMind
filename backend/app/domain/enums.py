from enum import StrEnum


class UserRole(StrEnum):
    STUDENT = "student"
    ADMIN = "admin"


class DocumentStatus(StrEnum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
    DELETED = "deleted"


class ChatRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ArtifactType(StrEnum):
    SUMMARY = "summary"
    FLASHCARDS = "flashcards"
    MCQS = "mcqs"
    STUDY_GUIDE = "study_guide"

