from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.review import ReviewCreate, ReviewRead
from app.services import review_service
from app.services.review_service import (
    ReferenceNotFoundError,
    ReviewConflictError,
    ReviewNotFoundError,
)

# Submitted reviews are immutable in the MVP, so there are deliberately no PATCH, PUT or DELETE routes.
router = APIRouter(prefix="/reviews", tags=["reviews"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=ReviewRead, status_code=201)
def create_review(data: ReviewCreate, db: DbSession):
    try:
        return review_service.create_review(db, data)
    except ReferenceNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except ReviewConflictError as error:
        raise HTTPException(status_code=409, detail=str(error))


@router.get("/{review_id}", response_model=ReviewRead)
def get_review(review_id: int, db: DbSession):
    try:
        return review_service.get_review(db, review_id)
    except ReviewNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))
