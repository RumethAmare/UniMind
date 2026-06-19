from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.documents import DocumentIngestionService


class FakeDocumentRepo:
    def __init__(self, document):
        self.document = document
        self.statuses = []

    async def get_for_user(self, document_id, user_id):
        return self.document

    async def set_status(self, document_id, status, page_count=None, error=None):
        self.statuses.append((status, page_count, error))


class FakeChunkRepo:
    def __init__(self):
        self.rows = []

    async def create_many(self, chunks):
        self.rows = chunks


class FakeExtractor:
    def extract(self, path, mime_type):
        return [SimpleNamespace(page_number=1, text="alpha beta gamma delta")]


class FakeEmbeddings:
    async def embed_texts(self, texts):
        return [[0.1, 0.2, 0.3] for _ in texts]


class FakeVectorStore:
    def __init__(self):
        self.points = []

    async def upsert_chunks(self, points):
        self.points = points


class FakeSession:
    def __init__(self):
        self.commits = 0
        self.rollbacks = 0

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1


@pytest.mark.asyncio
async def test_ingestion_qdrant_payload_contains_metadata():
    user_id = uuid4()
    document = SimpleNamespace(
        id=uuid4(),
        user_id=user_id,
        course_id=uuid4(),
        title="Lecture 1",
        storage_path="/tmp/lecture.txt",
        mime_type="text/plain",
    )
    session = FakeSession()
    vector_store = FakeVectorStore()
    service = DocumentIngestionService(
        session=session,
        extractor=FakeExtractor(),
        embeddings=FakeEmbeddings(),
        vector_store=vector_store,
    )
    service.documents = FakeDocumentRepo(document)
    service.chunks = FakeChunkRepo()

    await service.process(document.id, user_id)

    payload = vector_store.points[0]["payload"]
    assert payload["user_id"] == str(user_id)
    assert payload["course_id"] == str(document.course_id)
    assert payload["document_id"] == str(document.id)
    assert payload["document_name"] == "Lecture 1"
    assert payload["page_number"] == 1
    assert payload["chunk_index"] == 0
    assert "chunk_id" in payload
