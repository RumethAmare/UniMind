from uuid import UUID

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models

from app.core.config import settings


class QdrantVectorStore:
    def __init__(self):
        self.client = AsyncQdrantClient(url=settings.qdrant_url)
        self.collection = settings.qdrant_collection

    async def ensure_collection(self) -> None:
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
        query_filter = models.Filter(must=must)
        if hasattr(self.client, "search"):
            return await self.client.search(
                collection_name=self.collection,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=top_k,
                with_payload=True,
            )

        response = await self.client.query_points(
            collection_name=self.collection,
            query=query_vector,
            query_filter=query_filter,
            limit=top_k,
            with_payload=True,
        )
        return response.points

    async def health(self) -> bool:
        await self.client.get_collections()
        return True
