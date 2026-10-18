from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
from google import genai
from google.genai import types
from dotenv import load_dotenv
import os

load_dotenv()

PDF_PATH = "backend/documents/shopEase_RAG_Knowledge_Base_v2.pdf"

gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

chroma = chromadb.PersistentClient(
    path="backend/chroma_db"
)

collection = chroma.get_or_create_collection(
    name="shopese_knowledge_v2"
)


def load_and_split_pdf():
    reader = PdfReader(PDF_PATH)

    text = ""

    for page in reader.pages:
        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    # Clean weird PDF control character
    text = text.replace("\x7f", " ")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=400,
        chunk_overlap=50
    )

    chunks = splitter.split_text(text)

    return chunks


def create_embeddings(chunks):

    # Clear old data from v2 collection
    existing = collection.get()

    if existing["ids"]:
        collection.delete(ids=existing["ids"])

    for index, chunk in enumerate(chunks):

        response = gemini.models.embed_content(
            model="gemini-embedding-001",
            contents=chunk,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT"
            )
        )

        embedding = response.embeddings[0].values

        collection.add(
            ids=[f"chunk-{index}"],
            documents=[chunk],
            embeddings=[embedding]
        )

    return len(chunks)

def get_collection_count():
    data = collection.get()
    return len(data["ids"])

def search_knowledge(query):

    response = gemini.models.embed_content(
        model="gemini-embedding-001",
        contents=query,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY"
        )
    )

    query_embedding = response.embeddings[0].values

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=3
    )

    return results["documents"][0]