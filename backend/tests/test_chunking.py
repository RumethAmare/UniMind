from app.infrastructure.extractors import PageText
from app.services.chunking import TextChunker


def test_chunker_applies_overlap():
    words = " ".join(f"w{i}" for i in range(12))
    chunks = TextChunker(chunk_size=5, overlap=2).chunk([PageText(page_number=3, text=words)])

    assert [chunk.token_count for chunk in chunks] == [5, 5, 5, 3]
    assert chunks[0].content == "w0 w1 w2 w3 w4"
    assert chunks[1].content == "w3 w4 w5 w6 w7"
    assert chunks[0].page_number == 3


def test_chunker_skips_empty_pages():
    chunks = TextChunker(chunk_size=5, overlap=1).chunk([PageText(page_number=1, text="  ")])

    assert chunks == []

