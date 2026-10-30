from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


class EmployeeNotFoundError(Exception):
    pass


class EmployeeConflictError(Exception):
    """Another employee already uses this employee code or email."""


def list_employees(db: Session, status: str | None = None) -> list[Employee]:
    query = select(Employee).order_by(Employee.id)
    if status is not None:
        query = query.where(Employee.status == status)
    return list(db.scalars(query))


def get_employee(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise EmployeeNotFoundError(f"Employee {employee_id} not found")
    return employee


def create_employee(db: Session, data: EmployeeCreate) -> Employee:
    _raise_if_taken(db, employee_code=data.employee_code, email=data.email)
    employee = Employee(**data.model_dump(), status="Active")
    db.add(employee)
    _commit(db, employee_code=data.employee_code, email=data.email)
    db.refresh(employee)
    return employee


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate) -> Employee:
    employee = get_employee(db, employee_id)
    changes = data.model_dump(exclude_unset=True)
    if "email" in changes:
        _raise_if_taken(db, email=changes["email"], exclude_id=employee_id)
    for field, value in changes.items():
        setattr(employee, field, value)
    _commit(db, email=changes.get("email"), exclude_id=employee_id)
    db.refresh(employee)
    return employee


def _find_conflict(
    db: Session,
    employee_code: str | None = None,
    email: str | None = None,
    exclude_id: int | None = None,
) -> str | None:
    """Return a message naming the clashing field, or None if nothing clashes."""
    for field, value in (("employee_code", employee_code), ("email", email)):
        if value is None:
            continue
        query = select(Employee.id).where(getattr(Employee, field) == value)
        if exclude_id is not None:
            query = query.where(Employee.id != exclude_id)
        if db.scalar(query) is not None:
            return f"{field} '{value}' already exists"
    return None


def _raise_if_taken(db: Session, **kwargs) -> None:
    conflict = _find_conflict(db, **kwargs)
    if conflict:
        raise EmployeeConflictError(conflict)


def _commit(db: Session, **kwargs) -> None:
    """Commit, turning a unique-constraint violation (e.g. a race) into a conflict error."""
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        conflict = _find_conflict(db, **kwargs)
        raise EmployeeConflictError(conflict or "employee_code or email already exists")
