from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.v1.router import api_router
from app.core.config import settings
from app.database.database import engine
import app.models  # noqa: F401


app = FastAPI(
    title="Auction Platform API",
    description="Real-time IPL-style auction platform",
    version="1.0.0",
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)

app.include_router(api_router)


def ensure_users_schema_compatibility():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}

    with engine.begin() as conn:
        if "password" in columns:
            conn.execute(text("ALTER TABLE users ALTER COLUMN password DROP NOT NULL"))

        if "role" in columns:
            conn.execute(text("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'"))

        if "hashed_password" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255)"))
            if "password" in columns:
                conn.execute(
                    text("UPDATE users SET hashed_password = password WHERE hashed_password IS NULL")
                )
            conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password SET NOT NULL"))

        if "is_admin" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN"))
            if "role" in columns:
                conn.execute(
                    text(
                        """
                        UPDATE users
                        SET is_admin = CASE
                            WHEN LOWER(role) = 'admin' THEN TRUE
                            ELSE FALSE
                        END
                        WHERE is_admin IS NULL
                        """
                    )
                )
            else:
                conn.execute(text("UPDATE users SET is_admin = FALSE WHERE is_admin IS NULL"))
            conn.execute(text("ALTER TABLE users ALTER COLUMN is_admin SET DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE users ALTER COLUMN is_admin SET NOT NULL"))

        if "created_at" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ"))
            conn.execute(text("UPDATE users SET created_at = NOW() WHERE created_at IS NULL"))
            conn.execute(text("ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW()"))
            conn.execute(text("ALTER TABLE users ALTER COLUMN created_at SET NOT NULL"))


@app.on_event("startup")
async def on_startup():
    ensure_users_schema_compatibility()
    from app.auction_engine.service import restore_live_timers

    await restore_live_timers()


@app.get("/")
def home():
    return {"message": "Auction Platform API", "status": "running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
