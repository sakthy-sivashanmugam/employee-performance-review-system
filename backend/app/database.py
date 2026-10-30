import os
from collections.abc import Iterator
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

# Load backend/.env if it exists; DATABASE_URL may also come from the real environment.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@lru_cache
def get_engine() -> Engine:
    """Create the shared engine on first use, so the app starts without a database."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Create backend/.env from backend/.env.example."
        )
    return create_engine(url, pool_pre_ping=True)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed afterwards."""
    with Session(get_engine()) as session:
        yield session
