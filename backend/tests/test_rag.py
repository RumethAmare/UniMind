from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.rag import (
    ContextBuilder,
    NO_CONTEXT_ANSWER,
    RagRetriever,
    RagService,
    RetrievedChunk,
    map_sources,
)


class FakeEmbeddings:
    async def embed_query(self, text: str) -> list[float]:
        return [0.1, 0.2, 0.3]


class FakeVectorStore:
    def __init__(self, hits):
        self.hits = hits

    async def search(self, **kwargs):
        return self.hits


class FakeChunkRepo:
    def __init__(self, chunks):
        self.chunks = {chunk.id: chunk for chunk in chunks}

    async def get_by_ids(self, ids):
        return [self.chunks[chunk_id] for chunk_id in ids if chunk_id in self.chunks]


class FakeLlm:
    def __init__(self, completion):
        self.completion = completion
        self.calls = 0

    async def complete_json(self, system_prompt: str, user_prompt: str) -> dict:
        self.calls += 1
        return self.completion


def chunk(content: str, chunk_id=None):
    return SimpleNamespace(id=chunk_id or uuid4(), content=content)


def hit(chunk_id, score: float, document_name: str = "Doc", page_number: int = 1):
    return SimpleNamespace(
        score=score,
        payload={
            "chunk_id": str(chunk_id),
            "document_name": document_name,
            "page_number": page_number,
        },
    )


@pytest.mark.asyncio
async def test_retriever_preserves_qdrant_score_order():
    low = chunk("low")
    high = chunk("high")
    retriever = RagRetriever(
        chunks=FakeChunkRepo([high, low]),
        embeddings=FakeEmbeddings(),
        vector_store=FakeVectorStore([hit(low.id, 0.7), hit(high.id, 0.95)]),
        min_score=0.2,
    )

    results = await retriever.retrieve(user_id=uuid4(), question="q")

    assert [item.chunk.id for item in results] == [low.id, high.id]


@pytest.mark.asyncio
async def test_retriever_filters_below_min_score():
    keep = chunk("keep")
    drop = chunk("drop")
    retriever = RagRetriever(
        chunks=FakeChunkRepo([keep, drop]),
        embeddings=FakeEmbeddings(),
        vector_store=FakeVectorStore([hit(drop.id, 0.1), hit(keep.id, 0.8)]),
        min_score=0.2,
    )

    results = await retriever.retrieve(user_id=uuid4(), question="q")

    assert [item.chunk.id for item in results] == [keep.id]


def test_context_builder_adds_headers_and_respects_max_chars():
    first = RetrievedChunk(chunk=chunk("short text"), score=0.9, document_name="Doc A", page_number=2)
    second = RetrievedChunk(chunk=chunk("x" * 200), score=0.8, document_name="Doc B", page_number=3)

    built = ContextBuilder(max_chars=120).build([first, second])

    assert f"[chunk_id={first.chunk.id} document=Doc A page=2]" in built.text
    assert "short text" in built.text
    assert second.chunk.id not in built.included_chunk_ids
    assert len(built.text) <= 120


@pytest.mark.asyncio
async def test_no_results_path_skips_llm():
    llm = FakeLlm({"answer": "should not call"})
    service = RagService(session=None, embeddings=FakeEmbeddings(), vector_store=FakeVectorStore([]), llm=llm)

    answer = await service.answer(user_id=uuid4(), question="q")

    assert answer.answer == NO_CONTEXT_ANSWER
    assert answer.confidence_score == 0.0
    assert answer.sources == []
    assert llm.calls == 0


def test_citation_mapper_ignores_unknown_used_chunk_ids():
    known = RetrievedChunk(chunk=chunk("known"), score=0.9, document_name="Doc", page_number=4)
    unknown_id = uuid4()

    sources = map_sources([known], [known.chunk.id], [str(unknown_id), "not-a-uuid"])

    assert len(sources) == 1
    assert sources[0].chunk_id == known.chunk.id
    assert sources[0].document_name == "Doc"


@pytest.mark.asyncio
async def test_rag_service_uses_model_chunk_ids_for_citations():
    first = chunk("alpha")
    second = chunk("beta")
    llm = FakeLlm(
        {
            "answer": "Answer from beta.",
            "confidence_score": 1.5,
            "used_chunk_ids": [str(second.id)],
        }
    )
    service = RagService(
        session=None,
        embeddings=FakeEmbeddings(),
        vector_store=FakeVectorStore([hit(first.id, 0.9), hit(second.id, 0.8)]),
        llm=llm,
    )
    service.chunks = FakeChunkRepo([first, second])
    service.retriever.chunks = service.chunks

    answer = await service.answer(user_id=uuid4(), question="q")

    assert answer.answer == "Answer from beta."
    assert answer.confidence_score == 1.0
    assert [source.chunk_id for source in answer.sources] == [second.id]
