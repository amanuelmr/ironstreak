"""FastAPI entry point for Ironstreak."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_tables
from routers import challenges, overview
from schemas import HealthOut

DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(title="Ironstreak", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(challenges.router)
app.include_router(overview.router)


@app.get("/api/health", response_model=HealthOut)
def health() -> dict:
    return {"status": "ok"}
