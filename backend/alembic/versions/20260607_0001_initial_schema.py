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


def upgrade() -> None:
    candidates = [
        Path(__file__).parents[2] / "database" / "init" / "001_initial_schema.sql",
        Path(__file__).parents[3] / "database" / "init" / "001_initial_schema.sql",
    ]
    schema_path = next(path for path in candidates if path.exists())
    op.get_bind().exec_driver_sql(schema_path.read_text())


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
