from pathlib import Path
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError, NotFoundError
from app.db.models import DocumentChunk
from app.db.repositories import ChunkRepository, CourseRepository, DocumentRepository
from app.domain.enums import DocumentStatus
from app.infrastructure.embeddings import EmbeddingProvider
from app.infrastructure.extractors import DocumentExtractor
from app.infrastructure.qdrant import QdrantVectorStore
from app.infrastructure.storage import LocalFileStorage
from app.services.chunking import TextChunker


class DocumentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.documents = DocumentRepository(session)
        self.courses = CourseRepository(session)
        self.storage = LocalFileStorage()

    async def upload(
        self,
        user_id: UUID,
        file: UploadFile,
        title: str | None = None,
        course_id: UUID | None = None,
    ):
        if course_id and not await self.courses.get_for_user(course_id, user_id):
            raise NotFoundError("Course not found")
        storage_path, size = await self.storage.save(file)
        document = await self.documents.create(
            user_id=user_id,
            course_id=course_id,
            title=title or Path(file.filename or "Untitled").stem,
            filename=file.filename or "upload",
            mime_type=file.content_type or "application/octet-stream",
            file_size_bytes=size,
            storage_path=storage_path,
        )
        await self.session.commit()
        return document

    async def list_documents(self, user_id: UUID):
        return await self.documents.list_for_user(user_id)

    async def get_document(self, document_id: UUID, user_id: UUID):
        document = await self.documents.get_for_user(document_id, user_id)
        if document is None:
            raise NotFoundError("Document not found")
        return document

    async def delete_document(self, document_id: UUID, user_id: UUID) -> None:
        await self.documents.soft_delete(document_id, user_id)
        await self.session.commit()


class DocumentIngestionService:
    def __init__(
        self,
        session: AsyncSession,
        extractor: DocumentExtractor | None = None,
        embeddings: EmbeddingProvider | None = None,
        vector_store: QdrantVectorStore | None = None,
    ):
        self.session = session
        self.documents = DocumentRepository(session)
        self.chunks = ChunkRepository(session)
        self.extractor = extractor or DocumentExtractor()
        self.embeddings = embeddings or EmbeddingProvider()
        self.vector_store = vector_store or QdrantVectorStore()
        self.chunker = TextChunker(settings.chunk_size, settings.chunk_overlap)

    async def process(self, document_id: UUID, user_id: UUID) -> None:
        document = await self.documents.get_for_user(document_id, user_id)
        if document is None:
            raise NotFoundError("Document not found")
        try:
            await self.documents.set_status(document.id, DocumentStatus.PROCESSING)
            await self.session.commit()

            pages = self.extractor.extract(document.storage_path, document.mime_type)
            chunks = self.chunker.chunk(pages)
            if not chunks:
                raise AppError("Document contains no extractable text")

            vectors = await self.embeddings.embed_texts([chunk.content for chunk in chunks])
            rows: list[DocumentChunk] = []
            points: list[dict] = []
            for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
                chunk_id = uuid4()
                point_id = uuid4()
                rows.append(
                    DocumentChunk(
                        id=chunk_id,
                        document_id=document.id,
                        course_id=document.course_id,
                        chunk_index=index,
                        page_number=chunk.page_number,
                        content=chunk.content,
                        token_count=chunk.token_count,
                        qdrant_point_id=point_id,
                    )
                )
                points.append(
                    {
                        "id": point_id,
                        "vector": vector,
                        "payload": {
                            "user_id": str(document.user_id),
                            "course_id": str(document.course_id) if document.course_id else None,
                            "document_id": str(document.id),
                            "chunk_id": str(chunk_id),
                            "document_name": document.title,
                            "page_number": chunk.page_number,
                            "chunk_index": index,
                        },
                    }
                )

            await self.vector_store.upsert_chunks(points)
            await self.chunks.create_many(rows)
            await self.documents.set_status(document.id, DocumentStatus.READY, page_count=len(pages))
            await self.session.commit()
        except Exception as exc:
            await self.session.rollback()
            await self.documents.set_status(document.id, DocumentStatus.FAILED, error=str(exc))
            await self.session.commit()
            raise
