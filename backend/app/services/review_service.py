from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Employee, PerformanceReview, ReviewPeriod
from app.schemas.review import ReviewCreate


class ReviewNotFoundError(Exception):
    pass


class ReferenceNotFoundError(Exception):
    """The employee or review period named in the request does not exist."""


class ReviewConflictError(Exception):
    """The review breaks a business rule: inactive employee, closed period or duplicate."""


def calculate_average(quality_of_work: int, delivery_ownership: int, teamwork_collaboration: int) -> Decimal:
    """Mean of the three ratings to two decimal places.

    The result matches the database check constraint (ROUND(sum / 3.0, 2)). The mean of three
    whole numbers is always .00, .33 or .67, so rounding never has to break a tie.
    """
    total = quality_of_work + delivery_ownership + teamwork_collaboration
    return (Decimal(total) / Decimal(3)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def list_reviews(
    db: Session,
    employee_id: int | None = None,
    review_period_id: int | None = None,
    department: str | None = None,
) -> list[dict]:
    """The review register: every submitted review, newest first, with employee and period names.

    One joined query, so there is no per-row lookup. Filters are combined with AND, and a
    filter that matches nothing simply gives an empty list.
    """
    query = (
        select(
            PerformanceReview.id,
            PerformanceReview.employee_id,
            Employee.employee_code,
            Employee.name.label("employee_name"),
            Employee.department,
            PerformanceReview.review_period_id,
            ReviewPeriod.name.label("review_period_name"),
            PerformanceReview.quality_of_work,
            PerformanceReview.delivery_ownership,
            PerformanceReview.teamwork_collaboration,
            PerformanceReview.average_rating,
            PerformanceReview.comments,
            PerformanceReview.submitted_at,
        )
        .join(Employee, PerformanceReview.employee_id == Employee.id)
        .join(ReviewPeriod, PerformanceReview.review_period_id == ReviewPeriod.id)
        .order_by(PerformanceReview.submitted_at.desc(), PerformanceReview.id.desc())
    )
    if employee_id is not None:
        query = query.where(PerformanceReview.employee_id == employee_id)
    if review_period_id is not None:
        query = query.where(PerformanceReview.review_period_id == review_period_id)
    if department is not None:
        query = query.where(func.lower(Employee.department) == department.lower())
    return [dict(row) for row in db.execute(query).mappings()]


def get_review(db: Session, review_id: int) -> PerformanceReview:
    review = db.get(PerformanceReview, review_id)
    if review is None:
        raise ReviewNotFoundError(f"Review {review_id} not found")
    return review


def create_review(db: Session, data: ReviewCreate) -> PerformanceReview:
    employee = db.get(Employee, data.employee_id)
    if employee is None:
        raise ReferenceNotFoundError(f"Employee {data.employee_id} not found")
    period = db.get(ReviewPeriod, data.review_period_id)
    if period is None:
        raise ReferenceNotFoundError(f"Review period {data.review_period_id} not found")

    if employee.status != "Active":
        raise ReviewConflictError(f"Employee {employee.employee_code} is not Active")
    if period.status != "Open":
        raise ReviewConflictError(f"Review period '{period.name}' is not Open")
    if _review_exists(db, data.employee_id, data.review_period_id):
        raise ReviewConflictError(_duplicate_message(employee, period))

    review = PerformanceReview(
        **data.model_dump(),
        average_rating=calculate_average(
            data.quality_of_work, data.delivery_ownership, data.teamwork_collaboration
        ),
    )
    db.add(review)
    try:
        db.commit()
    except IntegrityError:
        # Another request inserted the same employee and period after our check above.
        db.rollback()
        raise ReviewConflictError(_duplicate_message(employee, period))
    db.refresh(review)
    return review


def _review_exists(db: Session, employee_id: int, review_period_id: int) -> bool:
    query = select(PerformanceReview.id).where(
        PerformanceReview.employee_id == employee_id,
        PerformanceReview.review_period_id == review_period_id,
    )
    return db.scalar(query) is not None


def _duplicate_message(employee: Employee, period: ReviewPeriod) -> str:
    return f"Employee {employee.employee_code} already has a review for '{period.name}'"
