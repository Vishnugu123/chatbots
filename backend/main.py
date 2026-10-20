from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os

from backend.rag import (
    load_and_split_pdf,
    create_embeddings,
    search_knowledge,
    get_collection_count
)

load_dotenv()

app = FastAPI(title="ShopEase AI Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


class ChatRequest(BaseModel):
    message: str


@app.get("/")
def home():
    return {
        "message": "ShopEase AI Chatbot API is running"
    }


@app.post("/chat")
def chat(request: ChatRequest):

    # Step 1: Retrieve relevant knowledge
    results = search_knowledge(request.message)

    # Step 2: Combine retrieved chunks
    context = "\n\n".join(results)

    # Step 3: Send context + question to Gemini
    response = client.models.generate_content(
        model="gemini-3.8-flash",

        contents=f"""
ShopEase Knowledge Base:

{context}


Customer Question:
{request.message}
""",

        config=types.GenerateContentConfig(
            system_instruction="""
You are ShopEase's AI customer support assistant.

Answer the customer's question using ONLY the provided ShopEase Knowledge Base.

Rules:
1. Do not invent or assume business information.
2. If the answer is not available in the knowledge base, clearly say that you don't have that information.
3. Keep answers concise, helpful and professional.
4. Never ask for passwords, OTPs, CVV, PINs or other sensitive payment information.
5. If appropriate, suggest contacting human support.
"""
        )
    )

    return {
        "reply": response.text
    }


@app.get("/test-rag")
def test_rag():

    chunks = load_and_split_pdf()

    return {
        "total_chunks": len(chunks),
        "first_chunk": chunks[0]
    }


@app.post("/create-embeddings")
def create_rag_embeddings():

    chunks = load_and_split_pdf()

    total = create_embeddings(chunks)

    return {
        "message": "Embeddings created successfully",
        "total_chunks": total
    }


@app.get("/search")
def search(query: str):

    results = search_knowledge(query)

    return {
        "query": query,
        "results": results
    }


@app.get("/debug-rag")
def debug_rag():

    return {
        "collection_count": get_collection_count()
    }