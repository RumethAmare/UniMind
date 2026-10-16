import pytest

from app.core.config import Settings


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("unimind-qdrant-x1y2", "http://unimind-qdrant-x1y2:6333"),
        ("http://qdrant:6333", "http://qdrant:6333"),
        ("http://localhost", "http://localhost:6333"),
        ("https://cluster.cloud.qdrant.io:6333", "https://cluster.cloud.qdrant.io:6333"),
    ],
)
def test_qdrant_url_is_normalized(raw: str, expected: str):
    assert Settings(qdrant_url=raw).qdrant_url == expected


def test_plain_postgres_url_uses_asyncpg():
    settings = Settings(database_url="postgresql://u:p@db-host/unimind")
    assert settings.database_url == "postgresql+asyncpg://u:p@db-host/unimind"


def test_neon_url_options_are_translated_for_asyncpg():
    settings = Settings(
        database_url="postgresql://u:p@ep-x.neon.tech/neondb?sslmode=require&channel_binding=require"
    )
    assert settings.database_url == "postgresql+asyncpg://u:p@ep-x.neon.tech/neondb?ssl=require"
