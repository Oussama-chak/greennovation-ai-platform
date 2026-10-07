from ai.agents.rag.file_index import chunk_text, pages_to_documents, safe_pdf_filename


def test_safe_pdf_filename_rejects_paths_and_other_types():
    assert safe_pdf_filename("lesson 1.pdf") == "lesson 1.pdf"
    assert safe_pdf_filename(r"..\secret.pdf") == "secret.pdf"
    assert safe_pdf_filename("notes.docx") is None
    assert safe_pdf_filename("") is None


def test_chunk_text_overlaps_long_pages():
    text = "abcdefghij" * 200
    chunks = chunk_text(text, size=100, overlap=20)
    assert len(chunks) > 1
    assert chunks[0] == text[:100]
    assert chunks[1][:20] == text[80:100]


def test_pages_to_documents_keep_filename_and_page():
    docs = pages_to_documents("Intro.pdf", [(1, "Variables store values.")])
    assert len(docs) == 1
    assert docs[0].metadata["source"] == "Intro.pdf"
    assert docs[0].metadata["page"] == 1
    assert "Variables" in docs[0].page_content
