"""Neon PostgreSQL database for STARS chat history."""

import logging
import os
from contextlib import contextmanager

logger = logging.getLogger("stars.db")

_pool = None


def _create_pool():
    """Create the PostgreSQL connection pool."""
    global _pool

    database_url = os.environ.get("DATABASE_URL")

    if not database_url:
        logger.warning("DATABASE_URL is not set.")
        return False

    try:
        from psycopg_pool import ConnectionPool

        if _pool is None:
            _pool = ConnectionPool(
                conninfo=database_url,
                min_size=0,
                max_size=5,
                timeout=10,
                open=True,
            )

        logger.info("Neon PostgreSQL connection pool initialized.")
        return True

    except Exception:
        logger.exception("Failed to initialize Neon PostgreSQL connection pool.")
        _pool = None
        return False


def is_enabled():
    """Check whether the database is available."""
    if _pool is not None:
        return True

    return _create_pool()


@contextmanager
def _get_conn():
    """Get a database connection."""
    if not is_enabled():
        raise RuntimeError("Database is not available.")

    with _pool.connection() as conn:
        yield conn


def init_db():
    """Create the chat_history table if it does not exist."""
    if not is_enabled():
        return

    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS chat_history (
                        id SERIAL PRIMARY KEY,
                        session_id TEXT NOT NULL,
                        user_message TEXT NOT NULL,
                        assistant_response TEXT NOT NULL,
                        model TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                """)

                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_chat_history_session_created
                    ON chat_history (session_id, created_at DESC)
                """)

            conn.commit()

        logger.info("chat_history table is ready.")

    except Exception:
        logger.exception("Failed to initialize chat_history table.")


def save_message(session_id, user_message, assistant_response, model):
    """Save a chat message."""
    if not is_enabled():
        logger.warning("Chat message not saved: database unavailable.")
        return

    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO chat_history
                    (session_id, user_message, assistant_response, model)
                    VALUES (%s, %s, %s, %s)
                """, (
                    session_id,
                    user_message,
                    assistant_response,
                    model,
                ))

            conn.commit()

    except Exception:
        logger.exception("Failed to save chat message.")


def get_recent_messages(session_id, limit=20):
    """Get recent chats for the current session."""
    if not is_enabled():
        return []

    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        id,
                        user_message,
                        assistant_response,
                        model,
                        created_at
                    FROM chat_history
                    WHERE session_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                """, (session_id, limit))

                rows = cur.fetchall()

        return [
            {
                "id": row[0],
                "user_message": row[1],
                "assistant_response": row[2],
                "model": row[3],
                "created_at": row[4].isoformat(),
            }
            for row in rows
        ]

    except Exception:
        logger.exception("Failed to fetch recent chat history.")
        return []
