from uuid import UUID

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models

from app.core.config import settings


# Payload fields used in search filters. Qdrant strict mode (the Qdrant Cloud default)
# rejects filters on fields without a payload index.
FILTER_FIELDS = ("user_id", "course_id", "document_id")


class QdrantVectorStore:
    # Collections already checked by this process, to skip repeat setup calls.
    _prepared_collections: set[str] = set()

    def __init__(self, client: AsyncQdrantClient | None = None):
        self.client = client or AsyncQdrantClient(
            url=settings.qdrant_url, api_key=settings.qdrant_api_key
        )
        self.collection = settings.qdrant_collection

    async def ensure_collection(self) -> None:
        if self.collection in self._prepared_collections:
            return
        collections = await self.client.get_collections()
        names = {collection.name for collection in collections.collections}
        if self.collection not in names:
            await self.client.create_collection(
                collection_name=self.collection,
                vectors_config=models.VectorParams(
                    size=settings.embedding_dimension,
                    distance=models.Distance.COSINE,
                ),
            )
        # Creating an existing index is a no-op, so this also upgrades older collections.
        for field in FILTER_FIELDS:
            await self.client.create_payload_index(
                collection_name=self.collection,
                field_name=field,
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
        self._prepared_collections.add(self.collection)

    async def upsert_chunks(self, points: list[dict]) -> None:
        await self.ensure_collection()
        await self.client.upsert(
            collection_name=self.collection,
            points=[
                models.PointStruct(id=str(point["id"]), vector=point["vector"], payload=point["payload"])
                for point in points
            ],
        )

    async def search(
        self,
        query_vector: list[float],
        user_id: UUID,
        top_k: int,
        course_id: UUID | None = None,
        document_id: UUID | None = None,
    ) -> list[models.ScoredPoint]:
        await self.ensure_collection()
        must = [models.FieldCondition(key="user_id", match=models.MatchValue(value=str(user_id)))]
        if course_id:
            must.append(models.FieldCondition(key="course_id", match=models.MatchValue(value=str(course_id))))
        if document_id:
            must.append(models.FieldCondition(key="document_id", match=models.MatchValue(value=str(document_id))))
        return await self.client.search(
            collection_name=self.collection,
            query_vector=query_vector,
            query_filter=models.Filter(must=must),
            limit=top_k,
            with_payload=True,
        )

    async def health(self) -> bool:
        await self.client.get_collections()
        return True

