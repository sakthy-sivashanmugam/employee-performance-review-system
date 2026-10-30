from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

# strict=True rejects 4.0, "4" and true, so only real whole numbers get through.
Rating = Annotated[int, Field(strict=True, ge=1, le=5)]
Id = Annotated[int, Field(strict=True, gt=0)]


class ReviewCreate(BaseModel):
    """Request body for POST. The average and submission time are calculated by the backend,
    so sending them (or any other unknown field) is rejected."""

    model_config = ConfigDict(extra="forbid")

    employee_id: Id
    review_period_id: Id
    quality_of_work: Rating
    delivery_ownership: Rating
    teamwork_collaboration: Rating
    comments: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    review_period_id: int
    quality_of_work: int
    delivery_ownership: int
    teamwork_collaboration: int
    average_rating: float
    comments: str
    submitted_at: datetime
