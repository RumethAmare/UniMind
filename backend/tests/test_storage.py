from app.infrastructure.storage import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES


def test_upload_allowlist_contains_required_types():
    assert {".pdf", ".docx", ".txt"}.issubset(ALLOWED_EXTENSIONS)
    assert "application/pdf" in ALLOWED_MIME_TYPES
    assert "text/plain" in ALLOWED_MIME_TYPES

