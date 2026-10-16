import json
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, NotFoundError
from app.db.repositories import ChunkRepository, StudyRepository
from app.domain.enums import ArtifactType
from app.infrastructure.llm import create_llm_provider


class StudyService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.chunks = ChunkRepository(session)
        self.artifacts = StudyRepository(session)
        self.llm = create_llm_provider()

    async def generate(
        self,
        user_id: UUID,
        artifact_type: ArtifactType,
        title: str,
        course_id: UUID | None = None,
        document_id: UUID | None = None,
    ):
        chunks = await self.chunks.list_for_scope(user_id, course_id, document_id, limit=30)
        if not chunks:
            raise AppError("No ready document content found for this scope")
        context = "\n\n".join(chunk.content for chunk in chunks)
        prompt = self._prompt(artifact_type, context)
        content = await self.llm.complete_json(
            "You generate study material from uploaded course content. Return valid JSON only.",
            prompt,
        )
        artifact = await self.artifacts.create(
            user_id=user_id,
            course_id=course_id,
            document_id=document_id,
            artifact_type=artifact_type,
            title=title,
            content=content,
        )
        await self.session.commit()
        return artifact

    async def list_artifacts(self, user_id: UUID):
        return await self.artifacts.list_for_user(user_id)

    async def get_artifact(self, artifact_id: UUID, user_id: UUID):
        artifact = await self.artifacts.get_for_user(artifact_id, user_id)
        if artifact is None:
            raise NotFoundError("Study session not found")
        return artifact

    async def delete_artifact(self, artifact_id: UUID, user_id: UUID) -> None:
        artifact = await self.get_artifact(artifact_id, user_id)
        await self.artifacts.delete(artifact)
        await self.session.commit()

    def _prompt(self, artifact_type: ArtifactType, context: str) -> str:
        instructions = {
            ArtifactType.SUMMARY: "Create a structured summary with key ideas and revision notes.",
            ArtifactType.FLASHCARDS: "Create flashcards as {'flashcards':[{'question':'','answer':''}]}",
            ArtifactType.MCQS: (
                "Create exactly 10 MCQs as {'mcqs':[{'question':'','options':['','','',''],"
                "'correct_answer':'','explanation':''}]}. Each question must have exactly four unique "
                "non-empty options. correct_answer must exactly match one option. Keep explanations concise."
            ),
            ArtifactType.STUDY_GUIDE: "Create key concepts, definitions, formulas, and exam revision notes.",
        }
        return f"{instructions[artifact_type]}\n\nContent:\n{context[:20000]}\n\nJSON only."
