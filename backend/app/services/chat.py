from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.db.repositories import ChatRepository, CourseRepository
from app.domain.enums import ChatRole
from app.schemas.chat import ChatAskResponse
from app.services.rag import RagService


class ChatService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.chats = ChatRepository(session)
        self.courses = CourseRepository(session)
        self.rag = RagService(session)

    async def create_session(self, user_id: UUID, course_id: UUID | None, title: str):
        if course_id and not await self.courses.get_for_user(course_id, user_id):
            raise NotFoundError("Course not found")
        chat_session = await self.chats.create_session(user_id, course_id, title)
        await self.session.commit()
        return chat_session

    async def list_sessions(self, user_id: UUID):
        return await self.chats.list_sessions(user_id)

    async def list_messages(self, session_id: UUID, user_id: UUID):
        chat_session = await self.chats.get_session(session_id, user_id)
        if chat_session is None:
            raise NotFoundError("Chat session not found")
        return await self.chats.list_messages(session_id, user_id)

    async def ask(self, session_id: UUID, user_id: UUID, question: str, top_k: int | None = None) -> ChatAskResponse:
        chat_session = await self.chats.get_session(session_id, user_id)
        if chat_session is None:
            raise NotFoundError("Chat session not found")
        user_msg = await self.chats.add_message(session_id, user_id, ChatRole.USER, question)
        answer = await self.rag.answer(
            user_id=user_id,
            question=question,
            course_id=chat_session.course_id,
            top_k=top_k,
        )
        source_dicts = [
            {
                "document_name": source.document_name,
                "page_number": source.page_number,
                "chunk_id": str(source.chunk_id),
            }
            for source in answer.sources
        ]
        assistant_msg = await self.chats.add_message(
            session_id=session_id,
            user_id=user_id,
            role=ChatRole.ASSISTANT,
            content=answer.answer,
            confidence_score=answer.confidence_score,
            sources=source_dicts,
        )
        await self.session.commit()
        return ChatAskResponse(
            session_id=session_id,
            user_message_id=user_msg.id,
            assistant_message_id=assistant_msg.id,
            answer=answer.answer,
            confidence_score=answer.confidence_score,
            sources=source_dicts,
        )

