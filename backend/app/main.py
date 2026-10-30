from fastapi import FastAPI

from app.routers import employees, health, review_periods, reviews

app = FastAPI(title="Employee Performance Review System")

app.include_router(health.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(review_periods.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
