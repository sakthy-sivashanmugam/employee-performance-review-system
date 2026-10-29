from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.performance_review import PerformanceReview


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint("status IN ('Active', 'Inactive')", name="status_valid"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_code: Mapped[str] = mapped_column(String(20), unique=True)  # e.g. EMP101
    name: Mapped[str] = mapped_column(String(100))
    department: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    status: Mapped[str] = mapped_column(String(10), default="Active")

    reviews: Mapped[list["PerformanceReview"]] = relationship(back_populates="employee")
