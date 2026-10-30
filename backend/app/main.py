from fastapi import FastAPI

from app.routers import employees, health

app = FastAPI(title="Employee Performance Review System")

app.include_router(health.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
