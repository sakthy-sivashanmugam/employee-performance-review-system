from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.review_period import ReviewPeriod


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"
    __table_args__ = (
        UniqueConstraint(
            "employee_id", "review_period_id", name="employee_period_unique"
        ),
        CheckConstraint(
            "quality_of_work BETWEEN 1 AND 5", name="quality_of_work_range"
        ),
        CheckConstraint(
            "delivery_ownership BETWEEN 1 AND 5", name="delivery_ownership_range"
        ),
        CheckConstraint(
            "teamwork_collaboration BETWEEN 1 AND 5",
            name="teamwork_collaboration_range",
        ),
        # Guarantees the stored average always matches the three ratings.
        CheckConstraint(
            "average_rating = ROUND("
            "(quality_of_work + delivery_ownership + teamwork_collaboration) / 3.0, 2)",
            name="average_matches_ratings",
        ),
        # Requires at least one non-whitespace character.
        CheckConstraint(r"comments ~ '\S'", name="comments_not_blank"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT")
    )
    review_period_id: Mapped[int] = mapped_column(
        ForeignKey("review_periods.id", ondelete="RESTRICT"), index=True
    )
    quality_of_work: Mapped[int] = mapped_column(SmallInteger)
    delivery_ownership: Mapped[int] = mapped_column(SmallInteger)
    teamwork_collaboration: Mapped[int] = mapped_column(SmallInteger)
    average_rating: Mapped[Decimal] = mapped_column(Numeric(3, 2))
    comments: Mapped[str] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    employee: Mapped["Employee"] = relationship(back_populates="reviews")
    review_period: Mapped["ReviewPeriod"] = relationship(back_populates="reviews")
