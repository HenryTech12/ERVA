from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _psycopg_url(url: str) -> str:
    """Hosted providers (Zerops, Railway, Render, etc.) hand out plain
    postgres://... / postgresql://... connection strings — normalize to the
    psycopg3 driver scheme this app is built on, without requiring every
    deployment target to know our SQLAlchemy driver choice."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


engine = create_engine(_psycopg_url(settings.postgres_url), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
