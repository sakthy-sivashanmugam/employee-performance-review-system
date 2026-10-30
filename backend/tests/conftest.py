import pytest
from fastapi.testclient import TestClient
from sqlalchemy import CheckConstraint, MetaData, create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models import Employee, PerformanceReview, ReviewPeriod


def sqlite_metadata() -> MetaData:
    """Copy of the tables for SQLite, without the PostgreSQL-only regex CHECK on comments."""
    metadata = MetaData()
    for table in (Employee.__table__, ReviewPeriod.__table__, PerformanceReview.__table__):
        table.to_metadata(metadata)
    reviews = metadata.tables["performance_reviews"]
    for constraint in list(reviews.constraints):
        if isinstance(constraint, CheckConstraint) and "~" in str(constraint.sqltext):
            reviews.constraints.discard(constraint)
    return metadata


@pytest.fixture
def client():
    """A test client backed by an in-memory SQLite database, never the real PostgreSQL one."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def enforce_foreign_keys(dbapi_connection, _):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    sqlite_metadata().create_all(engine)

    def override_get_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
