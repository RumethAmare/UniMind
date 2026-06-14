# UniMind Backend

FastAPI backend for UniMind.

## Local Development

Install dependencies:

```bash
cd backend
uv sync --extra dev
```

Run infrastructure:

```bash
docker compose up -d postgres qdrant
```

Run API:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

API docs:

```text
http://localhost:8000/docs
```

## Docker

```bash
docker compose up --build backend postgres qdrant
```

Health:

```text
GET /api/v1/health
GET /api/v1/ready
```

## Notes

- Set `OPENAI_API_KEY` before document ingestion, chat, or study generation.
- Default embeddings use OpenAI `text-embedding-3-small` with `EMBEDDING_DIMENSION=768`.
- Local BGE embeddings are optional: install `uv sync --extra local-embeddings` and set `EMBEDDING_PROVIDER=local`.
- Uploaded files are stored in the `backend_uploads` Docker volume.
- Document upload starts in-process background ingestion.
- PostgreSQL stores metadata and chat history; Qdrant stores vectors.
