"""SQLite conversation storage, scoped to this browser's signed session."""
import json
import os
import sqlite3
import threading
from uuid import uuid4
from contextlib import contextmanager

from flask import current_app, session


@contextmanager
def connect():
    path = current_app.config['CHAT_DATABASE']
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys = ON')
    try:
        with db:
            purge_expired(db)
            yield db
    finally:
        db.close()


def purge_expired(db):
    # updated_at is UTC; cascading foreign keys also delete all saved messages.
    db.execute("DELETE FROM conversations WHERE julianday(updated_at) <= julianday('now', '-6 hours')")


def start_cleanup(app):
    """Start once per server worker, after workers have forked."""
    lock = threading.Lock()
    started = False

    def cleanup_loop():
        while True:
            threading.Event().wait(60)
            try:
                with app.app_context(), connect():
                    pass
            except sqlite3.Error:
                app.logger.warning('Scheduled chat cleanup failed; it will retry in one minute.')

    @app.before_request
    def ensure_cleanup_worker():
        nonlocal started
        if app.testing:
            return
        with lock:
            if not started:
                threading.Thread(target=cleanup_loop, daemon=True, name='nova-chat-expiry').start()
                started = True


def init_store(app):
    app.config['CHAT_DATABASE'] = os.getenv('CHAT_DATABASE', os.path.join(app.instance_path, 'nova_chats.sqlite3'))
    # The first connection creates the schema before enabling automatic cleanup.
    path = app.config['CHAT_DATABASE']
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    db = sqlite3.connect(path)
    try:
        db.executescript('''
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL,
                subject TEXT NOT NULL, level TEXT NOT NULL, quiz TEXT,
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            );
            CREATE INDEX IF NOT EXISTS conversations_owner ON conversations(owner);
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY, conversation_id TEXT NOT NULL
                REFERENCES conversations(id) ON DELETE CASCADE,
                role TEXT NOT NULL, content TEXT NOT NULL
            );
        ''')
        db.commit()
    finally:
        db.close()
    with app.app_context(), connect():
        pass


def owner():
    if 'history_owner' not in session:
        session['history_owner'] = uuid4().hex
    session.permanent = True
    return session['history_owner']


def conversation(conversation_id):
    with connect() as db:
        return db.execute('SELECT * FROM conversations WHERE id=? AND owner=?',
                          (conversation_id, owner())).fetchone()


def save_turn(conversation_id, message, answer, subject, level, quiz):
    with connect() as db:
        # A long AI request may finish after its original conversation expired.
        if conversation_id and not db.execute('SELECT 1 FROM conversations WHERE id=? AND owner=?',
                                               (conversation_id, owner())).fetchone():
            conversation_id = None
        if not conversation_id:
            conversation_id = uuid4().hex
            db.execute('INSERT INTO conversations(id,owner,title,subject,level) VALUES(?,?,?,?,?)',
                       (conversation_id, owner(), message[:80], subject, level))
        db.executemany('INSERT INTO messages(conversation_id,role,content) VALUES(?,?,?)',
                       [(conversation_id, 'user', message), (conversation_id, 'assistant', answer)])
        db.execute("UPDATE conversations SET subject=?,level=?,quiz=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND owner=?",
                   (subject, level, json.dumps(quiz) if quiz else None, conversation_id, owner()))
    return conversation_id
