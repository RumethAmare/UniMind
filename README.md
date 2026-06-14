# UniMind Project Guide

UniMind is an AI-powered study assistant. Students upload course material, ask questions, and receive answers grounded in uploaded documents using Retrieval-Augmented Generation (RAG).

This guide documents the current working local setup: Next.js frontend, FastAPI backend, PostgreSQL, Qdrant, Gemini LLM/embeddings, Docker startup, local development, testing, and troubleshooting.

## Stack

- Frontend: Next.js, React, TypeScript, TailwindCSS, React Query
- Backend: FastAPI, Python 3.12+, SQLAlchemy async
- Database: PostgreSQL
- Vector database: Qdrant
- LLM: Gemini, default `gemini-2.5-flash`
- Embeddings: Gemini, default `gemini-embedding-001`
- Auth: JWT access and refresh tokens
- Deployment: Docker Compose

## Local URLs

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3010` |
| Backend OpenAPI docs | `http://localhost:8010/docs` |
| Backend health | `http://localhost:8010/api/v1/health` |
| Backend readiness | `http://localhost:8010/api/v1/ready` |
| Qdrant dashboard/API | `http://localhost:6340` |
| PostgreSQL host port | `localhost:55433` |

Inside Docker, services still use their container ports:

```env
INTERNAL_API_BASE_URL=http://backend:8000/api/v1
DATABASE_URL=postgresql+asyncpg://unimind:unimind@postgres:5432/unimind
QDRANT_URL=http://qdrant:6333
```

## Requirements

- Docker and Docker Compose
- Node.js 20 recommended for frontend local development
- Python 3.12+
- `uv` for backend local development
- Gemini API key for document ingestion, chat, RAG, and study generation
- Optional: Playwright browser binaries for e2e tests

## Environment Setup

Create local env files from examples if they do not already exist:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Set your Gemini key in `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Current AI defaults:

```env
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash
EMBEDDING_PROVIDER=gemini
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSION=768
```

Current root `.env` port defaults:

```env
FRONTEND_PORT=3010
BACKEND_PORT=8010
POSTGRES_PORT=55433
QDRANT_HTTP_PORT=6340
QDRANT_GRPC_PORT=6341
NEXT_PUBLIC_API_BASE_URL=/api/v1
INTERNAL_API_BASE_URL=http://backend:8000/api/v1
```

Never commit real `.env` files or API keys. Local env files are ignored by git.

## Docker Startup

Because this machine uses `/mnt/newvolume` for Docker temp space, start with:

```bash
TMPDIR=/mnt/newvolume/tmp docker compose up -d
```

Rebuild after code changes:

```bash
TMPDIR=/mnt/newvolume/tmp docker compose up -d --build frontend backend
```

Check status:

```bash
docker compose ps
curl http://localhost:3010/api/v1/health
```

Docker services:

- `frontend`: Next.js web app
- `backend`: FastAPI API server
- `postgres`: relational data for users, documents, chunks, chat, and study artifacts
- `qdrant`: vector database for semantic search

Docker volumes:

- `backend_uploads`: uploaded PDF/DOCX/TXT files
- `postgres_data`: PostgreSQL data
- `qdrant_data`: Qdrant vector storage

## Local Development Startup

Run infrastructure first:

```bash
TMPDIR=/mnt/newvolume/tmp docker compose up -d postgres qdrant
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

When running frontend locally, make sure the frontend API base URL points at the backend you are using.

## Working Pipeline

1. User registers or logs in.
2. User creates a course.
3. User uploads a PDF, DOCX, or TXT file.
4. Backend validates file extension, MIME type, and size.
5. Backend stores the file in local upload storage.
6. Backend creates a `documents` row with status `uploaded`.
7. Background ingestion starts in process.
8. Backend extracts text while preserving page numbers.
9. Text is cleaned and split into chunks.
10. Gemini `gemini-embedding-001` creates 768-dimensional embeddings.
11. PostgreSQL stores canonical chunk text and metadata.
12. Qdrant stores vectors and metadata payload.
13. Document status becomes `ready`, or `failed` if ingestion errors.
14. User asks a question in chat.
15. Backend embeds the query with Gemini.
16. Qdrant retrieves semantically relevant chunks using user/course/document filters.
17. Backend filters low-score results and fetches canonical chunk text from PostgreSQL.
18. Backend builds bounded context.
19. Gemini generates a grounded JSON answer.
20. Backend returns answer, confidence score, and citations.
21. Frontend renders the answer and citation drawer.

If you switch embedding providers or embedding models, re-upload or reprocess documents so stored Qdrant vectors match the active embedding space.

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
- `/chat`: chat sessions, question answering, citation drawer, chat deletion
- `/study`: summaries, flashcards, interactive MCQs, study guides
- `/settings`: profile, API status, theme, course management

Main behaviors:

- JWT tokens are stored client-side for API calls.
- `Authorization: Bearer <token>` is attached to protected requests.
- Dark mode is persisted in local storage.
- Document list polls status so `uploaded` and `processing` can update to `ready` or `failed`.
- Chat UI uses a loading state while the backend generates an answer.
- Chat sessions can be deleted from the sidebar with confirmation.
- Citation drawer shows document name, page number, and chunk ID.
- MCQ study artifacts render as an interactive quiz:
  - selecting an option gives immediate feedback
  - wrong answers show the correct answer
  - explanations appear after answering
  - answers can be reset

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
  - `DELETE /chat/sessions/{session_id}`
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
http://localhost:8010/docs
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

Deleting a chat session deletes its messages through the existing `ON DELETE CASCADE` relationship.

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

### Missing Gemini Key

Symptoms:

- Document ingestion fails.
- Chat or study generation returns `GEMINI_API_KEY is not configured`.

Fix `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=gemini
```

Restart backend:

```bash
TMPDIR=/mnt/newvolume/tmp docker compose restart backend
```

### Gemini Model Not Found

Symptoms:

```text
models/... is not found for API version v1beta
```

Current working defaults:

```env
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

You can list models using the Gemini API if your key changes model availability.

### Qdrant Client Search Errors

The backend supports newer Qdrant clients using `query_points`. If you see a Qdrant client method error, rebuild the backend image:

```bash
TMPDIR=/mnt/newvolume/tmp docker compose up -d --build backend
```

### Slow Docker Build Or No Space Left

Use the new-volume temp directory:

```bash
TMPDIR=/mnt/newvolume/tmp docker compose up -d --build frontend backend
```

The project has a `.dockerignore` so Docker should not send `node_modules`, `.next`, caches, or env files as build context.

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

- missing Gemini API key
- invalid PDF text extraction
- Qdrant unavailable
- Gemini request failure

Failed documents should show `failed` status and an error message.

### Frontend Cannot Reach Backend

For Docker, frontend should use:

```env
NEXT_PUBLIC_API_BASE_URL=/api/v1
INTERNAL_API_BASE_URL=http://backend:8000/api/v1
```

Rebuild frontend if this value changes:

```bash
TMPDIR=/mnt/newvolume/tmp docker compose up -d --build frontend
```

### Port Conflicts

Current local host ports:

- Frontend: `3010`
- Backend: `8010`
- PostgreSQL: `55433`
- Qdrant HTTP: `6340`
- Qdrant gRPC: `6341`

Change ports in root `.env` if needed:

```env
FRONTEND_PORT=3010
BACKEND_PORT=8010
POSTGRES_PORT=55433
QDRANT_HTTP_PORT=6340
QDRANT_GRPC_PORT=6341
```

### Stale Login Token

If the app returns `401 Unauthorized` after database resets or backend changes:

1. Hard refresh the app.
2. Log in again.
3. If needed, clear browser local storage for `http://localhost:3010`.

## Optional Providers

OpenAI remains available in code as an optional provider. To switch back, set:

```env
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=768
```

Local BGE embeddings are also optional:

```bash
cd backend
uv sync --extra local-embeddings
```

Then set:

```env
EMBEDDING_PROVIDER=local
LOCAL_EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
```

Local embeddings may be slower and require more CPU/RAM.

## Current Limitations

- Ingestion runs as an in-process background task.
- Chat responses are non-streaming.
- Uploaded document preview is metadata/citation based; full PDF preview is not implemented.
- MCQ quiz attempts are frontend-only and are not saved.
- No organization/team billing model.
- No Kubernetes manifests yet.
