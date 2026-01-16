import random
import time
import csv
import io
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

app = FastAPI(title="Call Center Chatbot (PoC)")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Setup ---
from database import get_db, init_db, engine
from models import Base, ChatSession, ChatMessage as ChatMessageModel, ChatEvaluation

# Create tables on startup
Base.metadata.create_all(bind=engine)

# --- Pydantic Models ---

class ChatMessage(BaseModel):
    role: str
    content: str
    
class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[str] = None  # Optional session tracking

class SessionCreate(BaseModel):
    source: str = "web"
    user_agent: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    started_at: datetime

class EvaluationCreate(BaseModel):
    session_id: str
    is_helpful: Optional[bool] = None
    rating: Optional[int] = None
    feedback_text: Optional[str] = None

# --- RAG Engine ---

from services.rag_engine import RagEngine

# Initialize RAG Engine
rag_engine = RagEngine()


# --- Chat Endpoints ---

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Returns a JSON response with answer and potential options.
    Optionally logs the message if session_id is provided.
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
    confidence = rag_result.get("score", 0.0)
    
    # Log messages if session_id provided
    if request.session_id:
        # Log user message
        user_msg = ChatMessageModel(
            session_id=request.session_id,
            role="user",
            content=last_user_message
        )
        db.add(user_msg)
        
        # Log assistant message
        assistant_msg = ChatMessageModel(
            session_id=request.session_id,
            role="assistant",
            content=answer or "No answer found",
            confidence_score=confidence
        )
        db.add(assistant_msg)
        db.commit()
    
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


# --- Session Endpoints ---

@app.post("/api/sessions", response_model=SessionResponse)
async def create_session(data: SessionCreate, db: Session = Depends(get_db)):
    """Create a new chat session for tracking."""
    session = ChatSession(
        source=data.source,
        user_agent=data.user_agent
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "started_at": session.started_at}


@app.patch("/api/sessions/{session_id}")
async def end_session(session_id: str, db: Session = Depends(get_db)):
    """Mark a session as ended."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        session.ended_at = datetime.utcnow()
        db.commit()
        return {"status": "ended", "session_id": session_id}
    return {"error": "Session not found"}


# --- Evaluation Endpoints ---

@app.post("/api/evaluations")
async def create_evaluation(data: EvaluationCreate, db: Session = Depends(get_db)):
    """Save user evaluation/feedback for a session."""
    evaluation = ChatEvaluation(
        session_id=data.session_id,
        is_helpful=data.is_helpful,
        rating=data.rating,
        feedback_text=data.feedback_text
    )
    db.add(evaluation)
    db.commit()
    return {"status": "saved", "session_id": data.session_id}


# --- Analytics Endpoints ---

@app.get("/api/analytics/summary")
async def get_analytics_summary(db: Session = Depends(get_db)):
    """Get summary analytics data."""
    total_sessions = db.query(ChatSession).count()
    total_messages = db.query(ChatMessageModel).count()
    total_evaluations = db.query(ChatEvaluation).count()
    
    helpful_count = db.query(ChatEvaluation).filter(ChatEvaluation.is_helpful == True).count()
    not_helpful_count = db.query(ChatEvaluation).filter(ChatEvaluation.is_helpful == False).count()
    
    avg_rating = 0
    if total_evaluations > 0:
        ratings = db.query(ChatEvaluation.rating).filter(ChatEvaluation.rating != None).all()
        if ratings:
            avg_rating = sum(r[0] for r in ratings) / len(ratings)
    
    return {
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "total_evaluations": total_evaluations,
        "helpful_count": helpful_count,
        "not_helpful_count": not_helpful_count,
        "average_rating": round(avg_rating, 2),
        "resolution_rate": round(helpful_count / max(total_evaluations, 1) * 100, 1)
    }


@app.get("/api/analytics/export")
async def export_analytics_csv(db: Session = Depends(get_db)):
    """Export all analytics data as CSV."""
    # Get all sessions with their evaluations
    sessions = db.query(ChatSession).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "session_id", "started_at", "ended_at", "source",
        "is_helpful", "rating", "feedback", "message_count"
    ])
    
    for session in sessions:
        message_count = len(session.messages)
        eval_data = session.evaluation
        writer.writerow([
            session.id,
            session.started_at.isoformat() if session.started_at else "",
            session.ended_at.isoformat() if session.ended_at else "",
            session.source,
            eval_data.is_helpful if eval_data else "",
            eval_data.rating if eval_data else "",
            eval_data.feedback_text if eval_data else "",
            message_count
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=analytics_export.csv"}
    )


@app.get("/")
def health_check():
    return {"status": "ok", "service": "Call Center Chatbot Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

