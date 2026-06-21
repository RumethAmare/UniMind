"""Add persisted chat material scope.

Revision ID: 20260621_0002
Revises: 20260607_0001
Create Date: 2026-06-21
"""

import sqlalchemy as sa
from alembic import op

revision = "20260621_0002"
down_revision = "20260607_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chat_sessions",
        sa.Column("scope_mode", sa.String(length=30), nullable=False, server_default="all"),
    )
    op.create_table(
        "chat_session_documents",
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column("document_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("session_id", "document_id"),
    )
    op.create_index("ix_chat_session_documents_document_id", "chat_session_documents", ["document_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_session_documents_document_id", table_name="chat_session_documents")
    op.drop_table("chat_session_documents")
    op.drop_column("chat_sessions", "scope_mode")
