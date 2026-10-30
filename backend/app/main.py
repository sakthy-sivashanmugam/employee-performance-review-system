from fastapi import FastAPI

from app.routers import health

app = FastAPI(title="Employee Performance Review System")

app.include_router(health.router, prefix="/api")
