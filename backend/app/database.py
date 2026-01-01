from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool
from app.config import get_settings

settings = get_settings()

# SQLite-specific configuration for better concurrency handling
# - check_same_thread=False: Required for async SQLite
# - timeout=30: Wait up to 30 seconds for database lock
connect_args = {
    "check_same_thread": False,
    "timeout": 30,
}

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    connect_args=connect_args,
    # Use StaticPool for SQLite to reuse single connection and avoid lock contention
    poolclass=StaticPool,
)


# Set SQLite pragmas for better concurrency on each connection
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    # WAL mode allows concurrent reads while writing
    cursor.execute("PRAGMA journal_mode=WAL")
    # Wait up to 30 seconds for locks
    cursor.execute("PRAGMA busy_timeout=30000")
    # Synchronous=NORMAL is faster than FULL but still safe with WAL
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


# Sync engine for SQLAdmin (convert async URL to sync)
sync_database_url = settings.database_url.replace("+aiosqlite", "")
sync_engine = create_engine(
    sync_database_url,
    connect_args={"check_same_thread": False, "timeout": 30},
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
