from types import SimpleNamespace

from rag.flow.chunker.title_chunker.group_chunker import GroupTitleChunker
from rag.flow.parser.pdf_chunk_metadata import PDF_POSITIONS_KEY


def test_extract_line_records_keeps_json_upstream_items():
    chunker = object.__new__(GroupTitleChunker)
    chunker.from_upstream = SimpleNamespace(
        output_format="json",
        chunks=None,
        json_result=[
            {
                "text": "第一章 电源系统",
                "doc_type_kwd": "text",
                "layout_type": "title",
                "layoutno": "1",
            }
        ],
    )

    records = chunker.extract_line_records()

    assert len(records) == 1
    assert records[0]["text"] == "第一章 电源系统"
    assert records[0]["doc_type_kwd"] == "text"
    assert records[0]["layout"] == "title 1"
    assert records[0][PDF_POSITIONS_KEY] == []
