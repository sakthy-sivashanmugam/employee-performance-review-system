from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.review_period import (
    ReviewPeriodCreate,
    ReviewPeriodRead,
    ReviewPeriodUpdate,
    Status,
)
from app.services import review_period_service
from app.services.review_period_service import InvalidPeriodDatesError, ReviewPeriodNotFoundError

router = APIRouter(prefix="/review-periods", tags=["review periods"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ReviewPeriodRead])
def list_review_periods(db: DbSession, status: Status | None = None):
    return review_period_service.list_review_periods(db, status)


@router.get("/{period_id}", response_model=ReviewPeriodRead)
def get_review_period(period_id: int, db: DbSession):
    try:
        return review_period_service.get_review_period(db, period_id)
    except ReviewPeriodNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.post("", response_model=ReviewPeriodRead, status_code=201)
def create_review_period(data: ReviewPeriodCreate, db: DbSession):
    return review_period_service.create_review_period(db, data)


@router.patch("/{period_id}", response_model=ReviewPeriodRead)
def update_review_period(period_id: int, data: ReviewPeriodUpdate, db: DbSession):
    try:
        return review_period_service.update_review_period(db, period_id, data)
    except ReviewPeriodNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except InvalidPeriodDatesError as error:
        raise HTTPException(status_code=422, detail=str(error))
