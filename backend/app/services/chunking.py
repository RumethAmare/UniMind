from dataclasses import dataclass

from app.infrastructure.extractors import PageText


@dataclass(frozen=True)
class TextChunk:
    content: str
    page_number: int
    token_count: int


class TextChunker:
    def __init__(self, chunk_size: int, overlap: int):
        if overlap >= chunk_size:
            raise ValueError("overlap must be smaller than chunk_size")
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, pages: list[PageText]) -> list[TextChunk]:
        chunks: list[TextChunk] = []
        for page in pages:
            words = page.text.split()
            if not words:
                continue
            step = self.chunk_size - self.overlap
            for start in range(0, len(words), step):
                window = words[start : start + self.chunk_size]
                if not window:
                    continue
                chunks.append(
                    TextChunk(
                        content=" ".join(window),
                        page_number=page.page_number,
                        token_count=len(window),
                    )
                )
                if start + self.chunk_size >= len(words):
                    break
        return chunks

