import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PageText:
    page_number: int
    text: str


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class DocumentExtractor:
    def extract(self, path: str, mime_type: str) -> list[PageText]:
        suffix = Path(path).suffix.lower()
        if suffix == ".pdf" or mime_type == "application/pdf":
            return self._extract_pdf(path)
        if suffix == ".docx":
            return self._extract_docx(path)
        return self._extract_txt(path)

    def _extract_pdf(self, path: str) -> list[PageText]:
        from pypdf import PdfReader

        reader = PdfReader(path)
        return [
            PageText(page_number=index + 1, text=clean_text(page.extract_text() or ""))
            for index, page in enumerate(reader.pages)
        ]

    def _extract_docx(self, path: str) -> list[PageText]:
        from docx import Document

        doc = Document(path)
        text = "\n".join(paragraph.text for paragraph in doc.paragraphs)
        return [PageText(page_number=1, text=clean_text(text))]

    def _extract_txt(self, path: str) -> list[PageText]:
        text = Path(path).read_text(encoding="utf-8", errors="ignore")
        return [PageText(page_number=1, text=clean_text(text))]

