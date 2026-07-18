import os

# Must be set before any app module is imported: database.py raises if
# DATABASE_URL is unset, and its load_dotenv(override=False) will not
# clobber a value that is already in the environment. The throwaway
# sqlite:// engine it creates is never queried (get_db is overridden and
# lifespan never runs).
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    yield factory
    engine.dispose()


@pytest.fixture()
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Deliberately NOT `with TestClient(app)`: entering the context manager
    # runs lifespan, which would call create_tables() on the real engine and
    # start the APScheduler. Keep it context-manager-free.
    yield TestClient(app)
    app.dependency_overrides.clear()
