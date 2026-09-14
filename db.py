"""Neon PostgreSQL access for chat history.

This module is intentionally self-contained and defensive: every public
function fails safe (logs and returns an empty/None result) so that a
database outage or a missing DATABASE_URL never breaks the chatbot itself.
"""

import logging
import os
from contextlib import contextmanager

logger = logging.getLogger("stars.db")

DATABASE_URL = os.environ.get("DATABASE_URL")

_pool = None
_db_enabled = False

if DATABASE_URL:
    try:
        from psycopg_pool import ConnectionPool

        # min_size=0 means no connection is opened until it's actually needed,
        # which keeps app startup fast and avoids failing hard if Neon is
        # briefly unreachable when the app boots.
        _pool = ConnectionPool(
            conninfo=DATABASE_URL,
            min_size=0,
            max_size=5,
            open=True,
            timeout=5,
        )
        _db_enabled = True
        logger.info("Neon PostgreSQL connection pool initialized.")
    except Exception:
        logger.exception(
            "Could not initialize the PostgreSQL connection pool. "
            "Chat history storage will be disabled; the chatbot will still work."
        )
        _pool = None
        _db_enabled = False
else:
    logger.warning(
        "DATABASE_URL is not set. Chat history storage is disabled; the chatbot will still work."
    )


def is_enabled() -> bool:
    """Whether the database is configured and available for use."""
    return _db_enabled and _pool is not None


@contextmanager
def _get_conn():
    with _pool.connection() as conn:
        yield conn


def init_db() -> None:
    """Create the chat_history table (and its index) if they don't already exist.

    Safe to call every time the app starts. Never raises.
    """
    if not is_enabled():
        return
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS chat_history (
                        id SERIAL PRIMARY KEY,
                        session_id TEXT NOT NULL,
                        user_message TEXT NOT NULL,
                        assistant_response TEXT NOT NULL,
                        model TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_chat_history_session_created
                    ON chat_history (session_id, created_at DESC)
                    """
                )
            conn.commit()
        logger.info("chat_history table is ready.")
    except Exception:
        logger.exception("Failed to initialize the chat_history table.")


def save_message(session_id: str, user_message: str, assistant_response: str, model: str) -> None:
    """Save one chat exchange (the message actually shown to the user).

    Never raises: on any failure this logs the error and returns, so a
    database problem can never break the chatbot response itself.
    """
    if not is_enabled():
        return
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO chat_history (session_id, user_message, assistant_response, model)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (session_id, user_message, assistant_response, model),
                )
            conn.commit()
    except Exception:
        logger.exception("Failed to save a chat message to the database.")


def get_recent_messages(session_id: str, limit: int = 20) -> list[dict]:
    """Return the most recent chat exchanges for a session, newest first.

    Returns an empty list on any failure (including a disabled database).
    """
    if not is_enabled():
        return []
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, user_message, assistant_response, model, created_at
                    FROM chat_history
                    WHERE session_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (session_id, limit),
                )
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
