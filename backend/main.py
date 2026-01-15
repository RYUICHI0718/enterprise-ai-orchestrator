import random
import time
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="Call Center Chatbot (PoC)")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---

class ChatMessage(BaseModel):
    role: str
    content: str
    
class ChatRequest(BaseModel):
    messages: List[ChatMessage]

# --- Mock Data & Logic ---

from services.rag_engine import RagEngine

# Initialize RAG Engine
rag_engine = RagEngine()



# --- Endpoints ---

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Returns a JSON response with answer and potential options.
    """
    last_user_message = request.messages[-1].content
    
    # Simulate processing delay
    time.sleep(1.0) 
    
    # --- Human Handoff Mock Logic ---
    if "オペレーターへ" in last_user_message:
        return {
            "role": "assistant",
            "content": "承知いたしました。担当のオペレーターにお繋ぎします。\n\n現在の待ち時間：**約 1 分**\n\nこれまでの会話履歴はオペレーターに共有されます。そのまましばらくお待ちください...",
            "options": [],
            "related_questions": []
        }

    rag_result = rag_engine.search(last_user_message)
    
    answer = rag_result["answer"]
    options = rag_result["options"]
    related = rag_result.get("related", [])
    
    if answer:
        response_data = {
            "role": "assistant",
            "content": answer,
            "options": options,
            "related_questions": related
        }
    else:
        # Fallback / Escalation
        response_data = {
            "role": "assistant",
            "content": "申し訳ありません。そのご質問についてはFAQに見当たりませんでした。\nオペレーターにお繋ぎしますか？",
            "options": ["はい（オペレーターへ）", "いいえ（メニューに戻る）"],
            "related_questions": []
        }

    return response_data

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Call Center Chatbot Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
