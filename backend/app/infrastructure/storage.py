from pathlib import Path
from uuid import uuid4

import aiofiles
from fastapi import UploadFile

from app.core.config import settings
from app.core.errors import AppError

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


class LocalFileStorage:
    def __init__(self, upload_dir: Path = settings.upload_dir):
        self.upload_dir = upload_dir

    async def save(self, file: UploadFile) -> tuple[str, int]:
        filename = file.filename or "upload"
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            raise AppError("Unsupported file type")
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise AppError("Unsupported MIME type")

        self.upload_dir.mkdir(parents=True, exist_ok=True)
        path = self.upload_dir / f"{uuid4()}{suffix}"
        size = 0
        async with aiofiles.open(path, "wb") as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_upload_bytes:
                    raise AppError("Upload exceeds maximum size")
                await out.write(chunk)
        if size == 0:
            raise AppError("Uploaded file is empty")
        return str(path), size

