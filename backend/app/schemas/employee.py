from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Status = Literal["Active", "Inactive"]

# Lengths match the database columns, so bad input gets a clean 422 instead of a database error.
EmployeeCode = Annotated[
    str, StringConstraints(strip_whitespace=True, pattern=r"^EMP[0-9]+$", max_length=20)
]
Text100 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Email = Annotated[
    str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=1, max_length=254)
]


class EmployeeCreate(BaseModel):
    """Request body for POST. New employees are always Active, so status is not accepted."""

    model_config = ConfigDict(extra="forbid")

    employee_code: EmployeeCode
    name: Text100
    department: Text100
    email: Email


class EmployeeUpdate(BaseModel):
    """Request body for PATCH. Only the fields sent are changed; employee_code is immutable."""

    model_config = ConfigDict(extra="forbid")

    name: Text100 | None = None
    department: Text100 | None = None
    email: Email | None = None
    status: Status | None = None

    @model_validator(mode="after")
    def check_fields_sent(self) -> "EmployeeUpdate":
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("fields cannot be null")
        return self


class EmployeeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    name: str
    department: str
    email: str
    status: Status
