from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate, Status
from app.services import employee_service
from app.services.employee_service import EmployeeConflictError, EmployeeNotFoundError

router = APIRouter(prefix="/employees", tags=["employees"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[EmployeeRead])
def list_employees(db: DbSession, status: Status | None = None):
    return employee_service.list_employees(db, status)


@router.get("/{employee_id}", response_model=EmployeeRead)
def get_employee(employee_id: int, db: DbSession):
    try:
        return employee_service.get_employee(db, employee_id)
    except EmployeeNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.post("", response_model=EmployeeRead, status_code=201)
def create_employee(data: EmployeeCreate, db: DbSession):
    try:
        return employee_service.create_employee(db, data)
    except EmployeeConflictError as error:
        raise HTTPException(status_code=409, detail=str(error))


@router.patch("/{employee_id}", response_model=EmployeeRead)
def update_employee(employee_id: int, data: EmployeeUpdate, db: DbSession):
    try:
        return employee_service.update_employee(db, employee_id, data)
    except EmployeeNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except EmployeeConflictError as error:
        raise HTTPException(status_code=409, detail=str(error))
