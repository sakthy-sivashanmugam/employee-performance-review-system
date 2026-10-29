"""Insert fictional development data: five employees and two review periods.

Safe to rerun: a record is only inserted if it is not already present.
Run from the backend/ directory:  python -m scripts.seed_dev
"""
import os
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import Employee, ReviewPeriod

EMPLOYEES = [
    {"employee_code": "EMP101", "name": "Alex Morgan", "department": "Engineering", "email": "alex.morgan@example.com"},
    {"employee_code": "EMP102", "name": "Priya Nair", "department": "Engineering", "email": "priya.nair@example.com"},
    {"employee_code": "EMP103", "name": "Jordan Lee", "department": "Marketing", "email": "jordan.lee@example.com"},
    {"employee_code": "EMP104", "name": "Sam Carter", "department": "Finance", "email": "sam.carter@example.com"},
    {"employee_code": "EMP105", "name": "Mei Tanaka", "department": "Human Resources", "email": "mei.tanaka@example.com"},
]

REVIEW_PERIODS = [
    {"name": "2026 H1", "start_date": date(2026, 1, 1), "end_date": date(2026, 6, 30), "status": "Closed"},
    {"name": "2026 H2", "start_date": date(2026, 7, 1), "end_date": date(2026, 12, 31), "status": "Open"},
]


class SeedConflictError(Exception):
    """Existing data conflicts with the seed data and cannot be resolved safely."""


def seed(session: Session) -> tuple[int, int]:
    """Insert missing seed records. Returns (inserted, skipped)."""
    inserted = skipped = 0

    for data in EMPLOYEES:
        code, email = data["employee_code"], data["email"]
        by_code = session.scalar(select(Employee.id).where(Employee.employee_code == code))
        by_email = session.scalar(select(Employee.id).where(Employee.email == email))

        if by_code is None and by_email is None:
            session.add(Employee(status="Active", **data))
            inserted += 1
        elif by_code is not None and by_code == by_email:
            skipped += 1  # same employee already exists
        else:
            raise SeedConflictError(
                f"Seed employee {code} conflicts with existing data: the employee code "
                f"matches employee id {by_code} and the email matches employee id {by_email} "
                "(None = no match). Resolve this manually before reseeding."
            )

    for data in REVIEW_PERIODS:
        # review_periods.name is not unique, so match on name and both dates.
        exists = session.scalar(
            select(ReviewPeriod.id).where(
                ReviewPeriod.name == data["name"],
                ReviewPeriod.start_date == data["start_date"],
                ReviewPeriod.end_date == data["end_date"],
            )
        )
        if exists:
            skipped += 1
        else:
            session.add(ReviewPeriod(**data))
            inserted += 1

    return inserted, skipped


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL is not set. Create backend/.env from backend/.env.example.")

    engine = create_engine(url)
    try:
        # session.begin() commits on success and rolls everything back on error.
        with Session(engine) as session, session.begin():
            inserted, skipped = seed(session)
    except SeedConflictError as error:
        raise SystemExit(f"Seed aborted, no changes were saved. {error}")

    print(f"Seed complete: {inserted} inserted, {skipped} skipped (already present).")


if __name__ == "__main__":
    main()
