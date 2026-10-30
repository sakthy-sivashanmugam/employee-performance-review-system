from datetime import date
from typing import Annotated, Any, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, StringConstraints, model_validator

Status = Literal["Open", "Closed"]


def _require_string(value: Any) -> Any:
    """Dates must be sent as ISO text (YYYY-MM-DD); pydantic would otherwise accept numbers."""
    if not isinstance(value, str):
        raise ValueError("date must be a string in YYYY-MM-DD format")
    return value


# Length matches the database column, so bad input gets a clean 422 instead of a database error.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
IsoDate = Annotated[date, BeforeValidator(_require_string)]


class ReviewPeriodCreate(BaseModel):
    """Request body for POST. New periods are always Open, so status is not accepted."""

    model_config = ConfigDict(extra="forbid")

    name: Name
    start_date: IsoDate
    end_date: IsoDate

    @model_validator(mode="after")
    def check_dates_ordered(self) -> "ReviewPeriodCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date")
        return self


class ReviewPeriodUpdate(BaseModel):
    """Request body for PATCH. Only the fields sent are changed."""

    model_config = ConfigDict(extra="forbid")

    name: Name | None = None
    start_date: IsoDate | None = None
    end_date: IsoDate | None = None
    status: Status | None = None

    @model_validator(mode="after")
    def check_fields_sent(self) -> "ReviewPeriodUpdate":
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("fields cannot be null")
        # If only one date is sent, the service compares it with the stored one.
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date")
        return self


class ReviewPeriodRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_date: date
    end_date: date
    status: Status
