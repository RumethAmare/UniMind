# UniMind Project Guide

UniMind is an AI-powered study assistant. Students upload course material, ask questions, and receive answers grounded in their uploaded documents using Retrieval-Augmented Generation (RAG).

This guide covers the current working system: requirements, startup commands, pipeline behavior, API surface, testing, and troubleshooting.

## Stack

- Frontend: Next.js, React, TypeScript, TailwindCSS, React Query
- Backend: FastAPI, Python 3.12+, SQLAlchemy async
- Database: PostgreSQL
- Vector database: Qdrant
- Embeddings: OpenAI `text-embedding-3-small`
- LLM: OpenAI chat model, default `gpt-4o-mini`
- Auth: JWT access and refresh tokens
- Deployment: Docker Compose

## Local URLs

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend OpenAPI docs | `http://localhost:8000/docs` |
| Backend health | `http://localhost:8000/api/v1/health` |
| Backend readiness | `http://localhost:8000/api/v1/ready` |
| Qdrant dashboard/API | `http://localhost:6333` |

## Requirements

- Docker and Docker Compose
- Node.js 20 recommended for frontend local development
- Python 3.12+
- `uv` for backend local development
- OpenAI API key for document ingestion, chat, RAG, and study generation
- Optional: Playwright browser binaries for frontend e2e tests

## Environment Setup

Create local env files from examples:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Set your OpenAI key in `backend/.env`:

```env
OPENAI_API_KEY=your_new_key_here
```

Never commit real `.env` files or API keys. The repository `.gitignore` excludes local env files.

Important defaults:

```env
BACKEND_PORT=8000
FRONTEND_PORT=3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=768
RAG_TOP_K=5
RAG_MIN_SCORE=0.2
RAG_MAX_CONTEXT_CHARS=12000
```

## Docker Startup

Start the full product:

```bash
docker compose up --build frontend backend postgres qdrant
```

Then open:

```text
http://localhost:3000
```

Docker services:

- `frontend`: Next.js web app
- `backend`: FastAPI API server
- `postgres`: relational database for users, documents, chunks, chat, and study artifacts
- `qdrant`: vector database for semantic search

Docker volumes:

- `backend_uploads`: uploaded PDF/DOCX/TXT files
- `postgres_data`: PostgreSQL data
- `qdrant_data`: Qdrant vector storage

## Local Development Startup

Run infrastructure first:

```bash
docker compose up -d postgres qdrant
```

Run backend locally:

```bash
cd backend
uv sync --extra dev
uv run uvicorn app.main:app --reload
```

Run frontend locally:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Working Pipeline

1. User registers or logs in.
2. User creates a course.
3. User uploads a PDF, DOCX, or TXT file.
4. Backend validates file extension, MIME type, and size.
5. Backend stores file in local upload storage.
6. Backend creates a `documents` row with status `uploaded`.
7. Background ingestion starts.
8. Backend extracts text while preserving page numbers.
9. Text is cleaned and split into chunks.
10. OpenAI `text-embedding-3-small` creates 768-dimensional embeddings.
11. PostgreSQL stores canonical chunk text and metadata.
12. Qdrant stores vectors and metadata payload.
13. Document status becomes `ready`, or `failed` if ingestion errors.
14. User asks a question in chat.
15. Backend embeds the query.
16. Qdrant retrieves semantically relevant chunks using user/course/document filters.
17. Backend filters low-score results and fetches canonical chunk text from PostgreSQL.
18. Backend builds bounded context.
19. OpenAI generates a grounded JSON answer.
20. Backend returns answer, confidence score, and citations.
21. Frontend renders the answer and citation drawer.

## RAG Details

RAG config:

```env
RAG_TOP_K=5
RAG_MIN_SCORE=0.2
RAG_MAX_CONTEXT_CHARS=12000
```

Qdrant payload fields:

```json
{
  "user_id": "uuid",
  "course_id": "uuid|null",
  "document_id": "uuid",
  "chunk_id": "uuid",
  "document_name": "string",
  "page_number": 1,
  "chunk_index": 0
}
```

Answer shape:

```json
{
  "answer": "string",
  "confidence_score": 0.0,
  "sources": [
    {
      "document_name": "string",
      "page_number": 1,
      "chunk_id": "uuid"
    }
  ]
}
```

No-context fallback:

```text
I could not find enough relevant information in the uploaded materials.
```

In that case, `confidence_score` is `0.0` and `sources` is empty.

## Frontend Guide

Routes:

- `/login`: login and registration
- `/dashboard`: overview, recent documents, quick actions
- `/documents`: upload, list, status, delete
- `/chat`: chat sessions, question answering, citation drawer
- `/study`: summaries, flashcards, MCQs, study guides
- `/settings`: profile, API status, theme, course management

Main behaviors:

- JWT tokens are stored client-side for API calls.
- `Authorization: Bearer <token>` is attached to protected requests.
- Dark mode is persisted in local storage.
- Document list polls status so `uploaded` and `processing` can update to `ready` or `failed`.
- Chat UI uses a loading state while the backend generates an answer.
- Citation drawer shows document name, page number, and chunk ID.

## Backend Guide

API prefix:

```text
/api/v1
```

API groups:

- Auth:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `GET /auth/me`
- Courses:
  - `GET /courses`
  - `POST /courses`
  - `GET /courses/{course_id}`
  - `PATCH /courses/{course_id}`
  - `DELETE /courses/{course_id}`
- Documents:
  - `GET /documents`
  - `POST /documents/upload`
  - `GET /documents/{document_id}`
  - `DELETE /documents/{document_id}`
- Chat:
  - `POST /chat/sessions`
  - `GET /chat/sessions`
  - `GET /chat/sessions/{session_id}/messages`
  - `POST /chat/sessions/{session_id}/ask`
- Direct RAG:
  - `POST /rag/query`
- Study tools:
  - `POST /study/summary`
  - `POST /study/flashcards`
  - `POST /study/mcqs`
  - `POST /study/guide`
- Health:
  - `GET /health`
  - `GET /ready`

OpenAPI docs:

```text
http://localhost:8000/docs
```

## Database

PostgreSQL stores:

- users
- courses
- documents
- document chunks
- chat sessions
- chat messages
- study artifacts
- refresh tokens

Qdrant stores:

- chunk vectors
- metadata payload for retrieval filtering and citations

Canonical chunk text remains in PostgreSQL, not Qdrant.

## Testing

Backend:

```bash
cd backend
uv sync --extra dev
PYTHONPATH=. uv run pytest tests
python3 -m compileall app tests
```

Frontend:

```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Frontend e2e:

```bash
cd frontend
npx playwright install
npm run e2e
```

Docker config check:

```bash
docker compose config
```

## Troubleshooting

### Missing OpenAI Key

Symptoms:

- Document ingestion fails.
- Chat or study generation returns an API error.

Fix:

```bash
cd backend
```

Set in `backend/.env`:

```env
OPENAI_API_KEY=your_new_key_here
```

Restart backend.

### Slow Docker Build

First build downloads Node, Python, and project dependencies. Later builds should be faster through Docker cache.

The default setup uses OpenAI embeddings, so it does not install `sentence-transformers` or `torch` unless you explicitly use local embeddings.

### Playwright Browser Missing

Symptom:

```text
Executable doesn't exist
```

Fix:

```bash
cd frontend
npx playwright install
npm run e2e
```

### Backend Cannot Reach Postgres Or Qdrant

Check services:

```bash
docker compose ps
docker compose logs postgres
docker compose logs qdrant
docker compose logs backend
```

Inside Docker, backend should use:

```env
DATABASE_URL=postgresql+asyncpg://unimind:unimind@postgres:5432/unimind
QDRANT_URL=http://qdrant:6333
```

### Document Stuck In Processing

Check backend logs:

```bash
docker compose logs backend
```

Common causes:

- missing OpenAI API key
- invalid PDF text extraction
- Qdrant unavailable
- OpenAI request failure

Failed documents should show `failed` status and an error message.

### Frontend Cannot Reach Backend

Check frontend API base URL:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Rebuild frontend if this value changes in Docker:

```bash
docker compose up --build frontend
```

### Port Conflicts

Default ports:

- Frontend: `3000`
- Backend: `8000`
- PostgreSQL: `5432`
- Qdrant HTTP: `6333`
- Qdrant gRPC: `6334`

Change ports in `.env`:

```env
FRONTEND_PORT=3001
BACKEND_PORT=8001
POSTGRES_PORT=5433
QDRANT_HTTP_PORT=6335
QDRANT_GRPC_PORT=6336
```

## Optional Local Embeddings

Default embeddings use OpenAI. Local BGE embeddings are optional.

Install local embedding support:

```bash
cd backend
uv sync --extra local-embeddings
```

Set:

```env
EMBEDDING_PROVIDER=local
LOCAL_EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
```

This may be slower and requires more local CPU/RAM.

## Current Limitations

- Ingestion runs as an in-process background task.
- Chat responses are non-streaming.
- Uploaded document preview is metadata/citation based; full PDF preview is not implemented.
- No organization/team billing model.
- No Kubernetes manifests yet.

