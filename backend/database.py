"""
Database configuration and session management for analytics.
Uses SQLite for local development, easily swappable to PostgreSQL for production.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite for local development (swap to PostgreSQL URL for production)
# Example PostgreSQL: "postgresql://user:password@host:5432/dbname"
DATABASE_URL = "sqlite:///./analytics.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite specific
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for FastAPI to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize the database tables."""
    from . import models  # Import models to register them
    Base.metadata.create_all(bind=engine)
