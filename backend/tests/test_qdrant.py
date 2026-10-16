from types import SimpleNamespace

from app.infrastructure.qdrant import FILTER_FIELDS, QdrantVectorStore


class FakeQdrantClient:
    def __init__(self, existing: list[str]):
        self.existing = existing
        self.created: list[str] = []
        self.indexed: list[str] = []
        self.get_calls = 0

    async def get_collections(self):
        self.get_calls += 1
        return SimpleNamespace(collections=[SimpleNamespace(name=name) for name in self.existing])

    async def create_collection(self, collection_name, vectors_config):
        self.created.append(collection_name)

    async def create_payload_index(self, collection_name, field_name, field_schema):
        self.indexed.append(field_name)


async def test_ensure_collection_indexes_filter_fields_once(monkeypatch):
    monkeypatch.setattr(QdrantVectorStore, "_prepared_collections", set())
    client = FakeQdrantClient(existing=["unimind_chunks"])
    store = QdrantVectorStore(client=client)

    await store.ensure_collection()
    await QdrantVectorStore(client=client).ensure_collection()

    assert client.created == []
    assert client.indexed == list(FILTER_FIELDS)
    assert client.get_calls == 1


async def test_ensure_collection_creates_missing_collection(monkeypatch):
    monkeypatch.setattr(QdrantVectorStore, "_prepared_collections", set())
    client = FakeQdrantClient(existing=[])

    await QdrantVectorStore(client=client).ensure_collection()

    assert client.created == ["unimind_chunks"]
    assert client.indexed == list(FILTER_FIELDS)
