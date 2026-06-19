# UniMind Database

PostgreSQL is UniMind's source of truth. Qdrant stores vectors; PostgreSQL stores ownership, metadata, chat history, chunk text, and Qdrant point IDs.

## Run Locally

```bash
docker compose up -d postgres qdrant
```

PostgreSQL automatically loads `database/init/001_initial_schema.sql` on first volume creation.

Default local connection:

```text
postgresql://unimind:unimind@localhost:5432/unimind
```

If schema changes are needed after the volume already exists, reset the database volume or apply migration SQL manually.

## Tables

- `users`: student/admin accounts and auth identity.
- `courses`: per-user course collections.
- `documents`: uploaded PDF/DOCX/TXT metadata and processing status.
- `document_chunks`: chunk text, page number, token count, and Qdrant point ID.
- `chat_sessions`: persistent chat threads scoped to user and optional course.
- `chat_messages`: user/assistant/system messages, confidence score, and RAG citations.
- `study_artifacts`: summaries, flashcards, MCQs, and study guides.
- `refresh_tokens`: hashed refresh tokens for JWT sessions.

## ER Diagram

```mermaid
erDiagram
    users ||--o{ courses : owns
    users ||--o{ documents : uploads
    users ||--o{ chat_sessions : starts
    users ||--o{ chat_messages : sends
    users ||--o{ study_artifacts : generates
    users ||--o{ refresh_tokens : has

    courses ||--o{ documents : contains
    courses ||--o{ document_chunks : groups
    courses ||--o{ chat_sessions : scopes
    courses ||--o{ study_artifacts : scopes

    documents ||--o{ document_chunks : splits_into
    documents ||--o{ study_artifacts : source_for

    chat_sessions ||--o{ chat_messages : contains
```

## Notes

- UUID primary keys use `gen_random_uuid()` from `pgcrypto`.
- `documents.status` starts as `uploaded`, `processing`, `ready`, `failed`, or `deleted`.
- Uploaded files are stored outside PostgreSQL; `documents.storage_path` points to the file location.
- Embeddings are not stored in PostgreSQL. `document_chunks.qdrant_point_id` links each chunk to its vector.
- `chat_messages.sources` is JSONB to preserve citation payloads from RAG answers.
