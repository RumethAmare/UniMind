from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "UniMind"
    environment: str = "local"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    cors_origin_regex: str | None = None

    database_url: str = "postgresql+asyncpg://unimind:unimind@localhost:5432/unimind"

    jwt_secret_key: str = Field(default="change-me-in-production", min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    upload_dir: Path = Path("./uploads")
    max_upload_bytes: int = 50 * 1024 * 1024
    # Serverless hosts (Vercel) stop work after the response, so ingest before responding.
    ingest_inline: bool = False

    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None
    qdrant_collection: str = "unimind_chunks"

    embedding_provider: str = "gemini"
    embedding_model: str = "gemini-embedding-001"
    embedding_dimension: int = 768
    local_embedding_model: str = "BAAI/bge-base-en-v1.5"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_api_base_url: str = "https://generativelanguage.googleapis.com/v1beta"

    chunk_size: int = 500
    chunk_overlap: int = 100
    rag_top_k: int = 5
    rag_min_score: float = 0.2
    rag_max_context_chars: int = 12000

    rate_limit_auth: str = "10/minute"
    rate_limit_ai: str = "30/minute"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            value = value.replace("postgres://", "postgresql+asyncpg://", 1)
        elif value.startswith("postgresql://"):
            value = value.replace("postgresql://", "postgresql+asyncpg://", 1)
        # Hosted providers such as Neon append libpq options that asyncpg rejects.
        parts = urlsplit(value)
        query = []
        for key, option in parse_qsl(parts.query):
            if key == "sslmode":
                query.append(("ssl", option))
            elif key != "channel_binding":
                query.append((key, option))
        return urlunsplit(parts._replace(query=urlencode(query)))

    @field_validator("qdrant_url", mode="before")
    @classmethod
    def normalize_qdrant_url(cls, value: str) -> str:
        # Accept a bare hostname, e.g. from a platform's service discovery.
        if "://" not in value:
            value = f"http://{value}"
        if urlsplit(value).port is None:
            value = f"{value.rstrip('/')}:6333"
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
