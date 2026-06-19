from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import (
    ChatMessage,
    ChatSession,
    Course,
    Document,
    DocumentChunk,
    RefreshToken,
    StudyArtifact,
    User,
)


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get(self, user_id: UUID) -> User | None:
        return await self.session.get(User, user_id)

    async def create(self, email: str, full_name: str, password_hash: str) -> User:
        user = User(email=email.lower(), full_name=full_name, password_hash=password_hash)
        self.session.add(user)
        await self.session.flush()
        return user


class TokenRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def store_refresh_token(self, user_id: UUID, token_hash: str) -> RefreshToken:
        token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        )
        self.session.add(token)
        await self.session.flush()
        return token

    async def revoke(self, token_hash: str) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hash, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )

    async def is_active(self, token_hash: str) -> bool:
        result = await self.session.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > datetime.now(UTC),
            )
        )
        return result.scalar_one_or_none() is not None


class CourseRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_user(self, user_id: UUID) -> list[Course]:
        result = await self.session.execute(
            select(Course).where(Course.user_id == user_id).order_by(Course.updated_at.desc())
        )
        return list(result.scalars())

    async def get_for_user(self, course_id: UUID, user_id: UUID) -> Course | None:
        result = await self.session.execute(
            select(Course).where(Course.id == course_id, Course.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: UUID, name: str, description: str | None) -> Course:
        course = Course(user_id=user_id, name=name, description=description)
        self.session.add(course)
        await self.session.flush()
        return course

    async def update(self, course: Course, name: str | None, description: str | None) -> Course:
        if name is not None:
            course.name = name
        if description is not None:
            course.description = description
        await self.session.flush()
        return course

    async def delete(self, course: Course) -> None:
        await self.session.delete(course)
        await self.session.flush()


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_user(self, user_id: UUID) -> list[Document]:
        result = await self.session.execute(
            select(Document)
            .where(Document.user_id == user_id, Document.status != "deleted")
            .order_by(Document.created_at.desc())
        )
        return list(result.scalars())

    async def get_for_user(self, document_id: UUID, user_id: UUID) -> Document | None:
        result = await self.session.execute(
            select(Document).where(
                Document.id == document_id,
                Document.user_id == user_id,
                Document.status != "deleted",
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        user_id: UUID,
        course_id: UUID | None,
        title: str,
        filename: str,
        mime_type: str,
        file_size_bytes: int,
        storage_path: str,
    ) -> Document:
        doc = Document(
            user_id=user_id,
            course_id=course_id,
            title=title,
            filename=filename,
            mime_type=mime_type,
            file_size_bytes=file_size_bytes,
            storage_path=storage_path,
        )
        self.session.add(doc)
        await self.session.flush()
        return doc

    async def set_status(
        self, document_id: UUID, status: str, page_count: int | None = None, error: str | None = None
    ) -> None:
        await self.session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(status=status, page_count=page_count, error_message=error)
        )

    async def soft_delete(self, document_id: UUID, user_id: UUID) -> None:
        await self.session.execute(
            update(Document)
            .where(Document.id == document_id, Document.user_id == user_id)
            .values(status="deleted")
        )


class ChunkRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_many(self, chunks: list[DocumentChunk]) -> None:
        self.session.add_all(chunks)
        await self.session.flush()

    async def get_by_ids(self, ids: list[UUID]) -> list[DocumentChunk]:
        if not ids:
            return []
        result = await self.session.execute(select(DocumentChunk).where(DocumentChunk.id.in_(ids)))
        return list(result.scalars())

    async def list_for_scope(
        self, user_id: UUID, course_id: UUID | None = None, document_id: UUID | None = None, limit: int = 20
    ) -> list[DocumentChunk]:
        stmt = (
            select(DocumentChunk)
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(Document.user_id == user_id, Document.status == "ready")
            .order_by(DocumentChunk.created_at.desc())
            .limit(limit)
        )
        if course_id:
            stmt = stmt.where(DocumentChunk.course_id == course_id)
        if document_id:
            stmt = stmt.where(DocumentChunk.document_id == document_id)
        result = await self.session.execute(stmt)
        return list(result.scalars())


class ChatRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_session(self, user_id: UUID, course_id: UUID | None, title: str) -> ChatSession:
        chat_session = ChatSession(user_id=user_id, course_id=course_id, title=title)
        self.session.add(chat_session)
        await self.session.flush()
        return chat_session

    async def list_sessions(self, user_id: UUID) -> list[ChatSession]:
        result = await self.session.execute(
            select(ChatSession).where(ChatSession.user_id == user_id).order_by(ChatSession.updated_at.desc())
        )
        return list(result.scalars())

    async def get_session(self, session_id: UUID, user_id: UUID) -> ChatSession | None:
        result = await self.session.execute(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def add_message(
        self,
        session_id: UUID,
        user_id: UUID,
        role: str,
        content: str,
        confidence_score: float | None = None,
        sources: list[dict] | None = None,
    ) -> ChatMessage:
        msg = ChatMessage(
            session_id=session_id,
            user_id=user_id,
            role=role,
            content=content,
            confidence_score=confidence_score,
            sources=sources or [],
        )
        self.session.add(msg)
        await self.session.flush()
        return msg

    async def list_messages(self, session_id: UUID, user_id: UUID) -> list[ChatMessage]:
        result = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id, ChatMessage.user_id == user_id)
            .order_by(ChatMessage.created_at)
        )
        return list(result.scalars())


class StudyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        user_id: UUID,
        artifact_type: str,
        title: str,
        content: dict,
        course_id: UUID | None = None,
        document_id: UUID | None = None,
    ) -> StudyArtifact:
        artifact = StudyArtifact(
            user_id=user_id,
            course_id=course_id,
            document_id=document_id,
            artifact_type=artifact_type,
            title=title,
            content=content,
        )
        self.session.add(artifact)
        await self.session.flush()
        return artifact
