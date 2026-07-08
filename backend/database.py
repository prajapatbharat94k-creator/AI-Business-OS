from sqlmodel import create_engine, Session, SQLModel
from backend.config import DATABASE_URL

# connect_args={"check_same_thread": False} is required only for SQLite.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

def init_db():
    # Import all models to register them on SQLModel.metadata
    from backend import models
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
