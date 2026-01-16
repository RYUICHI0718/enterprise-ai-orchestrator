"""
SQLAlchemy models for analytics data.
Follows the schema defined in analytics_design.md.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class ChatSession(Base):
    """Represents a single chat conversation session."""
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    source = Column(String(50), default="web")  # web, line, etc.
    user_agent = Column(Text, nullable=True)

    # Relationships
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    evaluation = relationship("ChatEvaluation", back_populates="session", uselist=False, cascade="all, delete-orphan")


class ChatMessage(Base):
    """Stores individual messages within a session."""
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user / assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    matched_faq_id = Column(String(100), nullable=True)  # ID of matched FAQ if any
    confidence_score = Column(Float, nullable=True)  # RAG confidence score

    # Relationships
    session = relationship("ChatSession", back_populates="messages")


class ChatEvaluation(Base):
    """Stores user feedback/evaluation for a session."""
    __tablename__ = "chat_evaluations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("chat_sessions.id"), nullable=False, unique=True)
    is_helpful = Column(Boolean, nullable=True)  # YES/NO
    rating = Column(Integer, nullable=True)  # 1-5 stars
    feedback_text = Column(Text, nullable=True)  # Free-form comment
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("ChatSession", back_populates="evaluation")
