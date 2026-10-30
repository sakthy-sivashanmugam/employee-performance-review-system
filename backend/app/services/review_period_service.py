from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ReviewPeriod
from app.schemas.review_period import ReviewPeriodCreate, ReviewPeriodUpdate


class ReviewPeriodNotFoundError(Exception):
    pass


class InvalidPeriodDatesError(Exception):
    """The resulting end date would be before the start date."""


def list_review_periods(db: Session, status: str | None = None) -> list[ReviewPeriod]:
    query = select(ReviewPeriod).order_by(ReviewPeriod.id)
    if status is not None:
        query = query.where(ReviewPeriod.status == status)
    return list(db.scalars(query))


def get_review_period(db: Session, period_id: int) -> ReviewPeriod:
    period = db.get(ReviewPeriod, period_id)
    if period is None:
        raise ReviewPeriodNotFoundError(f"Review period {period_id} not found")
    return period


def create_review_period(db: Session, data: ReviewPeriodCreate) -> ReviewPeriod:
    period = ReviewPeriod(**data.model_dump(), status="Open")
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


def update_review_period(db: Session, period_id: int, data: ReviewPeriodUpdate) -> ReviewPeriod:
    period = get_review_period(db, period_id)
    changes = data.model_dump(exclude_unset=True)

    # The request alone cannot tell whether a single new date fits the stored one.
    start = changes.get("start_date", period.start_date)
    end = changes.get("end_date", period.end_date)
    if end < start:
        raise InvalidPeriodDatesError(
            f"end_date ({end}) must not be before start_date ({start})"
        )

    for field, value in changes.items():
        setattr(period, field, value)
    db.commit()
    db.refresh(period)
    return period
