from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import httpx
import time
import os

N8N_WEBHOOK_URL = "http://localhost:5678/webhook/shopease-lead"

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
    name: str | None = None
    email: str | None = None


@app.get("/")
def home():
    return {
        "message": "ShopEase AI Chatbot API is running"
    }


@app.post("/chat")
async def chat(request: ChatRequest):

    # Step 1: Retrieve relevant knowledge
    results = search_knowledge(request.message)

    # Step 2: Combine retrieved chunks
    context = "\n\n".join(results)

    # Step 3: Send context + question to Gemini
    try:
        response = None

        # First try: normal Flash model
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model="gemini-3.5-flash",

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

                break

            except Exception as e:
                print(
                    f"GEMINI FLASH ERROR (attempt {attempt + 1}):",
                    e
                )

                if attempt == 0:
                    time.sleep(2)

        # Fallback: Flash Lite
        if response is None:
            print("Trying Gemini 3.5 Flash Lite...")

            response = client.models.generate_content(
                model="gemini-3.5-flash-lite",

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

    except Exception as e:
        print("GEMINI FINAL ERROR:", e)

        return {
            "reply": "Sorry, our AI service is temporarily unavailable. Please try again in a moment.",
            "lead_sent": False
        }

    # Step 4: Send lead to n8n if customer provided contact details
    lead_sent = False

    if request.name and request.email:
        try:
            async with httpx.AsyncClient() as http_client:
                n8n_response = await http_client.post(
                    N8N_WEBHOOK_URL,
                    json={
                        "name": request.name,
                        "email": request.email,
                        "message": request.message
                    },
                    timeout=10
                )

            if n8n_response.status_code == 200:
                lead_sent = True

            print("N8N STATUS:", n8n_response.status_code)
            print("N8N RESPONSE:", n8n_response.text)

        except Exception as e:
            print("n8n webhook error:", e)

    return {
        "reply": response.text,
        "lead_sent": lead_sent
    }


class LeadRequest(BaseModel):
    name: str
    email: str
    message: str = "Callback requested from ShopEase AI chatbot"


@app.post("/lead")
async def create_lead(request: LeadRequest):

    try:
        async with httpx.AsyncClient() as http_client:

            n8n_response = await http_client.post(
                N8N_WEBHOOK_URL,
                json={
                    "name": request.name,
                    "email": request.email,
                    "message": request.message,
                },
                timeout=10,
            )

        print("N8N LEAD STATUS:", n8n_response.status_code)
        print("N8N LEAD RESPONSE:", n8n_response.text)

        if n8n_response.status_code != 200:
            return {
                "success": False,
                "message": "Unable to submit callback request."
            }

        return {
            "success": True,
            "message": "Callback request submitted successfully."
        }

    except Exception as e:

        print("LEAD ERROR:", e)

        return {
            "success": False,
            "message": "Lead service is temporarily unavailable."
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