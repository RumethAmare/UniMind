# UniMind

UniMind is an AI study assistant for course materials. Students create courses, upload PDF, DOCX, or TXT files, then use grounded chat and study tools to learn from their own documents.

## Features

- JWT authentication with access and refresh tokens
- Course and document management
- PDF, DOCX, and TXT ingestion with status tracking
- Retrieval-Augmented Generation (RAG) chat with document/page citations
- Persistent chat sessions with permanent deletion
- Per-chat material scope: all materials, one course, selected documents, or both
- Study tools for summaries, flashcards, MCQs, and study guides
- Saved study-session history with load and permanent delete
- Interactive MCQ quizzes with locked answers, instant correct/wrong feedback, explanations, score, and reset
- Dark mode and responsive Next.js UI

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Client state | TanStack React Query |
| UI icons | Lucide React |
| Backend | FastAPI on Python 3.12+ |
| Validation/config | Pydantic Settings |
| ORM/migrations | SQLAlchemy async, Alembic, asyncpg |
| Relational database | PostgreSQL 16 |
| Vector database | Qdrant 1.9.7 with `qdrant-client==1.10.1` |
| LLM | Gemini Developer API, `gemini-2.5-flash` |
| Embeddings | Gemini `gemini-embedding-001`, 768 dimensions |
| Authentication | `python-jose`, bcrypt |
| API protection | SlowAPI rate limiting, CORS middleware |
| Testing | Pytest, Vitest, Testing Library, Playwright |
| Containers/deployment | Docker Compose locally, Render Blueprint (`render.yaml`) |

## Architecture

1. Uploaded files are stored on disk and recorded in PostgreSQL.
2. Background ingestion extracts text, creates chunks, and generates Gemini embeddings.
3. PostgreSQL keeps canonical document/chunk data; Qdrant keeps vectors and retrieval metadata.
4. A chat request embeds its question, retrieves scoped chunks from Qdrant, builds bounded context, and asks Gemini for a grounded JSON response.
5. Responses include confidence and document/page citations.

If the embedding provider, model, or dimension changes, reprocess documents so stored Qdrant vectors use the same embedding space.

## Project Layout

```text
frontend/       Next.js application
backend/        FastAPI application and Alembic migrations
database/init/  Initial PostgreSQL schema
docker-compose.yml
render.yaml     Render Blueprint
```

## Local Setup

### Requirements

- Docker and Docker Compose
- Node.js 20+
- Python 3.12+
- `uv`
- Gemini API key

### Configure the backend

```bash
cp backend/.env.example backend/.env
```

Set this value in `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Important defaults:

```env
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSION=768
RAG_TOP_K=5
RAG_MIN_SCORE=0.2
RAG_MAX_CONTEXT_CHARS=12000
```

Never commit real API keys, database URLs, or `.env` files.

### Run with Docker Compose

```bash
docker compose up -d --build
docker compose ps
```

Docker Compose reads `backend/.env.example`. To provide a real Gemini key without editing tracked files, create an untracked `docker-compose.override.yml`:

```yaml
services:
  backend:
    environment:
      GEMINI_API_KEY: ${GEMINI_API_KEY}
```

Then set `GEMINI_API_KEY` in the root `.env` before starting Compose.

Default local URLs:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend docs | `http://localhost:8000/docs` |
| Backend health | `http://localhost:8000/api/v1/health` |
| Backend readiness | `http://localhost:8000/api/v1/ready` |
| Qdrant | `http://localhost:6333` |

For hosts with limited root-disk space, use a writable temporary directory:

```bash
TMPDIR=/mnt/newvolume/tmp docker compose up -d --build
```

### Run services directly

Start PostgreSQL and Qdrant first:

```bash
docker compose up -d postgres qdrant
```

Start the backend:

```bash
cd backend
uv sync --extra dev
uv run uvicorn app.main:app --reload
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1` for a directly-run frontend.

## Application Workflows

### Documents and RAG

1. Create a course, then upload a PDF, DOCX, or TXT document.
2. Wait until document status changes to `ready`.
3. Create a chat and choose its material scope.
4. Ask a question. UniMind retrieves relevant chunks and returns cited answer text.

The no-context response is:

```text
I could not find enough relevant information in the uploaded materials.
```

### Chat Scope

New chats can use:

- All ready user materials
- One course
- One or more selected ready documents
- One course plus selected documents from that course

Scope is saved with the chat and cannot be changed later. Deleting a scoped course or document never broadens a chat's search scope.

### Study Tools

Generated summaries, flashcards, MCQs, and study guides are automatically saved. The Study Tools page lists saved sessions, lets users reload them, and supports permanent deletion. MCQ sessions render as interactive quizzes when their saved content is valid.

## API

All endpoints use the `/api/v1` prefix.

| Group | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Courses | `GET/POST /courses`, `GET/PATCH/DELETE /courses/{course_id}` |
| Documents | `GET /documents`, `POST /documents/upload`, `GET/DELETE /documents/{document_id}` |
| Chat | `GET/POST /chat/sessions`, `DELETE /chat/sessions/{session_id}`, `GET /chat/sessions/{session_id}/messages`, `POST /chat/sessions/{session_id}/ask` |
| RAG | `POST /rag/query` |
| Study generation | `POST /study/summary`, `POST /study/flashcards`, `POST /study/mcqs`, `POST /study/guide` |
| Study history | `GET /study/artifacts`, `GET/DELETE /study/artifacts/{artifact_id}` |
| Health | `GET /health`, `GET /ready` |

OpenAPI documentation is available at `/docs` on the backend.

## Render Deployment

`render.yaml` provisions:

- `unimind-backend`: Docker web service with Alembic pre-deploy migration, persistent upload disk, PostgreSQL, Qdrant, Gemini configuration, and CORS settings
- `unimind-frontend`: Docker web service
- `unimind-qdrant`: private Qdrant service with persistent vector disk
- `unimind-postgres`: Render PostgreSQL database

Set `GEMINI_API_KEY` manually in the Render backend service environment. It is intentionally not stored in the repository. Render runs `alembic upgrade head` before backend deployments.

When frontend API URL configuration changes, redeploy the frontend because `NEXT_PUBLIC_API_BASE_URL` is baked into its production build.

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
npm run typecheck
npm run test
npm run build
```

Optional end-to-end tests:

```bash
cd frontend
npx playwright install
npm run e2e
```

## Troubleshooting

### Gemini errors

- `GEMINI_API_KEY is not configured`: add the key to local backend configuration or the Render backend environment.
- `429`: quota/rate-limit issue. Check Gemini API usage, plan, and billing.
- `503 UNAVAILABLE`: temporary model capacity issue. Retry later.

### Qdrant errors

The project pins `qdrant-client==1.10.1` because backend retrieval uses its compatible `.search()` API. Rebuild the backend after dependency changes.

### Document processing fails

Check backend logs. Common causes are missing Gemini credentials, unsupported/unreadable file content, unavailable Qdrant, or a Gemini API failure. Failed documents expose an error message in the document list.

### Authentication or API failures

Log in again after backend/database resets. For frontend deployment issues, verify `NEXT_PUBLIC_API_BASE_URL`, CORS origins, and backend health before rebuilding the frontend.

## Current Limitations

- Document ingestion runs in-process as a background task.
- Chat responses are non-streaming.
- Uploaded document preview is citation/metadata based; full PDF preview is not implemented.
- MCQ attempt state is browser-only and is not saved with study sessions.
- No organization/team model.
