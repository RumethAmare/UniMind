"""Initial UniMind schema.

Revision ID: 20260607_0001
Revises:
Create Date: 2026-06-07
"""

from pathlib import Path

from alembic import op

revision = "20260607_0001"
down_revision = None
branch_labels = None
depends_on = None


def split_sql_statements(sql: str) -> list[str]:
    statements: list[str] = []
    start = 0
    i = 0
    quote: str | None = None
    dollar_quote: str | None = None

    while i < len(sql):
        if dollar_quote:
            if sql.startswith(dollar_quote, i):
                i += len(dollar_quote)
                dollar_quote = None
            else:
                i += 1
            continue

        char = sql[i]

        if quote:
            if char == quote:
                if quote == "'" and i + 1 < len(sql) and sql[i + 1] == "'":
                    i += 2
                    continue
                quote = None
            i += 1
            continue

        if char in {"'", '"'}:
            quote = char
            i += 1
            continue

        if char == "$":
            end = sql.find("$", i + 1)
            if end != -1:
                tag = sql[i : end + 1]
                if tag == "$$" or tag[1:-1].replace("_", "").isalnum():
                    dollar_quote = tag
                    i = end + 1
                    continue

        if char == ";":
            statement = sql[start : i + 1].strip()
            if statement:
                statements.append(statement)
            start = i + 1

        i += 1

    tail = sql[start:].strip()
    if tail:
        statements.append(tail)
    return statements


def upgrade() -> None:
    candidates = [
        Path(__file__).parents[2] / "database" / "init" / "001_initial_schema.sql",
        Path(__file__).parents[3] / "database" / "init" / "001_initial_schema.sql",
    ]
    schema_path = next(path for path in candidates if path.exists())
    bind = op.get_bind()
    for statement in split_sql_statements(schema_path.read_text()):
        bind.exec_driver_sql(statement)


def downgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("DROP TABLE IF EXISTS refresh_tokens CASCADE")
    bind.exec_driver_sql("DROP TABLE IF EXISTS study_artifacts CASCADE")
    bind.exec_driver_sql("DROP TABLE IF EXISTS chat_messages CASCADE")
    bind.exec_driver_sql("DROP TABLE IF EXISTS chat_sessions CASCADE")
    bind.exec_driver_sql("DROP TABLE IF EXISTS document_chunks CASCADE")
    bind.exec_driver_sql("DROP TABLE IF EXISTS documents CASCADE")
    bind.exec_driver_sql("DROP TABLE IF EXISTS courses CASCADE")
    bind.exec_driver_sql("DROP TABLE IF EXISTS users CASCADE")
    bind.exec_driver_sql("DROP FUNCTION IF EXISTS set_updated_at CASCADE")
