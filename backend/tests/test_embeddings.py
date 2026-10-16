import json

import httpx

from app.core.config import settings
from app.infrastructure import embeddings
from app.infrastructure.embeddings import GeminiEmbeddingProvider


async def test_gemini_embeds_texts_in_batches(monkeypatch):
    batch_sizes: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith(":batchEmbedContents")
        requests = json.loads(request.content)["requests"]
        batch_sizes.append(len(requests))
        return httpx.Response(200, json={"embeddings": [{"values": [0.1, 0.2]} for _ in requests]})

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        embeddings.httpx,
        "AsyncClient",
        lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs),
    )
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")

    vectors = await GeminiEmbeddingProvider(dimension=2).embed_texts([f"chunk {i}" for i in range(150)])

    assert batch_sizes == [100, 50]
    assert len(vectors) == 150
