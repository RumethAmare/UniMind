import hashlib
import math

from app.core.config import settings
from app.core.errors import AppError


class EmbeddingProvider:
    def __init__(self, provider: str = settings.embedding_provider):
        self.provider = provider
        self._openai = OpenAIEmbeddingProvider()
        self._local: LocalEmbeddingProvider | None = None

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if self.provider == "openai":
            return await self._openai.embed_texts(texts)
        if self.provider == "local":
            if self._local is None:
                self._local = LocalEmbeddingProvider()
            return await self._local.embed_texts(texts)
        raise AppError(f"Unsupported embedding provider: {self.provider}")

    async def embed_query(self, text: str) -> list[float]:
        return (await self.embed_texts([text]))[0]


class OpenAIEmbeddingProvider:
    def __init__(
        self,
        model_name: str = settings.embedding_model,
        dimension: int = settings.embedding_dimension,
    ):
        self.model_name = model_name
        self.dimension = dimension
        self._client = None

    def _load(self):
        if not settings.openai_api_key:
            raise AppError("OPENAI_API_KEY is not configured")
        if self._client is None:
            from openai import AsyncOpenAI

            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        client = self._load()
        response = await client.embeddings.create(
            model=self.model_name,
            input=texts,
            dimensions=self.dimension,
        )
        return [item.embedding for item in response.data]

    async def embed_query(self, text: str) -> list[float]:
        return (await self.embed_texts([text]))[0]


class LocalEmbeddingProvider:
    def __init__(self, model_name: str = settings.local_embedding_model):
        self.model_name = model_name
        self._model = None

    def _load(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                raise AppError(
                    "Local embeddings require installing the local-embeddings extra"
                ) from exc

            self._model = SentenceTransformer(self.model_name)
        return self._model

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        model = self._load()
        vectors = model.encode(texts, normalize_embeddings=True)
        return [vector.tolist() for vector in vectors]

    async def embed_query(self, text: str) -> list[float]:
        return (await self.embed_texts([text]))[0]


class DeterministicEmbeddingProvider:
    """Test-friendly embedding provider with stable vector dimensions."""

    def __init__(self, dimension: int = settings.embedding_dimension):
        self.dimension = dimension

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(text) for text in texts]

    async def embed_query(self, text: str) -> list[float]:
        return self._embed(text)

    def _embed(self, text: str) -> list[float]:
        values = [0.0] * self.dimension
        for index, word in enumerate(text.lower().split()):
            digest = hashlib.sha256(word.encode("utf-8")).digest()
            bucket = int.from_bytes(digest[:4], "big") % self.dimension
            values[bucket] += 1.0 + (index % 7) / 10
        norm = math.sqrt(sum(value * value for value in values)) or 1.0
        return [value / norm for value in values]
