from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import DocumentChunk
from app.db.repositories import ChunkRepository
from app.infrastructure.embeddings import EmbeddingProvider
from app.infrastructure.llm import create_llm_provider
from app.infrastructure.qdrant import QdrantVectorStore

NO_CONTEXT_ANSWER = "I could not find enough relevant information in the uploaded materials."


@dataclass(frozen=True)
class Source:
    document_name: str
    page_number: int | None
    chunk_id: UUID


@dataclass(frozen=True)
class RagAnswer:
    answer: str
    confidence_score: float
    sources: list[Source]


@dataclass(frozen=True)
class RetrievedChunk:
    chunk: DocumentChunk
    score: float
    document_name: str
    page_number: int | None


@dataclass(frozen=True)
class BuiltContext:
    text: str
    included_chunk_ids: list[UUID]


class RagRetriever:
    def __init__(
        self,
        chunks: ChunkRepository,
        embeddings: EmbeddingProvider,
        vector_store: QdrantVectorStore,
        min_score: float = settings.rag_min_score,
    ):
        self.chunks = chunks
        self.embeddings = embeddings
        self.vector_store = vector_store
        self.min_score = min_score

    async def retrieve(
        self,
        user_id: UUID,
        question: str,
        course_id: UUID | None = None,
        document_id: UUID | None = None,
        top_k: int | None = None,
    ) -> list[RetrievedChunk]:
        query_vector = await self.embeddings.embed_query(question)
        hits = await self.vector_store.search(
            query_vector=query_vector,
            user_id=user_id,
            course_id=course_id,
            document_id=document_id,
            top_k=top_k or settings.rag_top_k,
        )
        kept_hits = [hit for hit in hits if float(hit.score) >= self.min_score]
        chunk_ids: list[UUID] = []
        hit_metadata: dict[UUID, tuple[float, str, int | None]] = {}
        for hit in kept_hits:
            payload = hit.payload or {}
            if "chunk_id" not in payload:
                continue
            chunk_id = UUID(str(payload["chunk_id"]))
            page_number = payload.get("page_number")
            chunk_ids.append(chunk_id)
            hit_metadata[chunk_id] = (
                float(hit.score),
                str(payload.get("document_name") or "Unknown document"),
                int(page_number) if page_number is not None else None,
            )

        chunk_rows = {chunk.id: chunk for chunk in await self.chunks.get_by_ids(chunk_ids)}
        retrieved: list[RetrievedChunk] = []
        for chunk_id in chunk_ids:
            chunk = chunk_rows.get(chunk_id)
            metadata = hit_metadata.get(chunk_id)
            if chunk is None or metadata is None:
                continue
            score, document_name, page_number = metadata
            retrieved.append(
                RetrievedChunk(
                    chunk=chunk,
                    score=score,
                    document_name=document_name,
                    page_number=page_number,
                )
            )
        return retrieved


class ContextBuilder:
    def __init__(self, max_chars: int = settings.rag_max_context_chars):
        self.max_chars = max_chars

    def build(self, chunks: list[RetrievedChunk]) -> BuiltContext:
        parts: list[str] = []
        included_ids: list[UUID] = []
        used_chars = 0
        for item in chunks:
            page = item.page_number if item.page_number is not None else "unknown"
            section = (
                f"[chunk_id={item.chunk.id} document={item.document_name} page={page}]\n"
                f"{item.chunk.content.strip()}"
            )
            separator = "\n\n---\n\n" if parts else ""
            addition = f"{separator}{section}"
            if used_chars + len(addition) > self.max_chars:
                break
            parts.append(section if not parts else addition[len(separator) :])
            included_ids.append(item.chunk.id)
            used_chars += len(addition)
        return BuiltContext(text="\n\n---\n\n".join(parts), included_chunk_ids=included_ids)


def clamp_confidence(value: object) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(confidence, 1.0))


def map_sources(
    retrieved: list[RetrievedChunk],
    included_chunk_ids: list[UUID],
    used_chunk_ids: list[object] | None,
) -> list[Source]:
    retrieved_by_id = {item.chunk.id: item for item in retrieved}
    valid_used_ids: list[UUID] = []
    for raw_id in used_chunk_ids or []:
        try:
            chunk_id = UUID(str(raw_id))
        except (TypeError, ValueError):
            continue
        if chunk_id in retrieved_by_id and chunk_id not in valid_used_ids:
            valid_used_ids.append(chunk_id)
    source_ids = valid_used_ids or included_chunk_ids
    return [
        Source(
            document_name=retrieved_by_id[chunk_id].document_name,
            page_number=retrieved_by_id[chunk_id].page_number,
            chunk_id=chunk_id,
        )
        for chunk_id in source_ids
        if chunk_id in retrieved_by_id
    ]


class RagService:
    def __init__(
        self,
        session: AsyncSession,
        embeddings: EmbeddingProvider | None = None,
        vector_store: QdrantVectorStore | None = None,
        llm=None,
        context_builder: ContextBuilder | None = None,
    ):
        self.session = session
        self.embeddings = embeddings or EmbeddingProvider()
        self.vector_store = vector_store or QdrantVectorStore()
        self.llm = llm or create_llm_provider()
        self.chunks = ChunkRepository(session)
        self.retriever = RagRetriever(self.chunks, self.embeddings, self.vector_store)
        self.context_builder = context_builder or ContextBuilder()

    async def answer(
        self,
        user_id: UUID,
        question: str,
        course_id: UUID | None = None,
        document_id: UUID | None = None,
        top_k: int | None = None,
    ) -> RagAnswer:
        retrieved = await self.retriever.retrieve(
            user_id=user_id,
            question=question,
            course_id=course_id,
            document_id=document_id,
            top_k=top_k,
        )
        if not retrieved:
            return RagAnswer(answer=NO_CONTEXT_ANSWER, confidence_score=0.0, sources=[])

        context = self.context_builder.build(retrieved)
        if not context.included_chunk_ids:
            return RagAnswer(answer=NO_CONTEXT_ANSWER, confidence_score=0.0, sources=[])

        system_prompt = (
            "You are UniMind, an AI study assistant. Answer only from supplied context. "
            "If context is insufficient, say so. Return valid JSON only with keys: "
            "answer, confidence_score, used_chunk_ids. used_chunk_ids must contain chunk_id values "
            "from context that support the answer."
        )
        user_prompt = f"Question:\n{question}\n\nContext:\n{context.text}"
        completion = await self.llm.complete_json(system_prompt, user_prompt)
        answer = str(completion.get("answer") or NO_CONTEXT_ANSWER)
        confidence = clamp_confidence(completion.get("confidence_score"))
        sources = map_sources(retrieved, context.included_chunk_ids, completion.get("used_chunk_ids"))
        return RagAnswer(answer=answer, confidence_score=confidence, sources=sources)
