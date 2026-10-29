from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.performance_review import PerformanceReview


class ReviewPeriod(Base):
    __tablename__ = "review_periods"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="dates_ordered"),
        CheckConstraint("status IN ('Open', 'Closed')", name="status_valid"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(10), default="Open")

    reviews: Mapped[list["PerformanceReview"]] = relationship(
        back_populates="review_period"
    )
