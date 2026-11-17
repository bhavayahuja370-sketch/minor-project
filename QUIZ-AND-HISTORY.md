# Quiz and recent chat update

Copy the updated files into STARS, including the new chat_store.py.
Keep your existing .env. No database software or additional Python packages are needed.

In the VS Code terminal inside STARS:

```powershell
python -m pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000 and enter the chatbot from the gateway.
Ask "give me Python quiz". The quiz now selects Python questions only.
The built-in quiz bank supports Python, HTML, CSS, Java, JavaScript, DBMS and SQL.
Java and JavaScript are matched as separate words. Unknown quiz topics prompt
you to choose an available subject instead of returning an unrelated quiz.

Chats save automatically in instance/nova_chats.sqlite3.
Chats and their messages are automatically deleted six hours after the last
message. A new message resets that conversation's six-hour timer. The server
checks once a minute while running, and on database access and startup. If the
server is stopped or sleeping, deletion resumes when it starts again. Existing
conversations older than six hours will also be deleted when you install this
update. The Recent chats list refreshes every minute while open.

Click Recent chats
and select a conversation to read it or continue it. New conversation creates
a separate thread without deleting saved conversations. Quiz state is saved
per conversation, so you can reopen a quiz and answer it later.

History belongs to the current browser cookie, not an email account. The existing
gateway does not verify accounts. Use the same browser and URL to reopen history;
clearing cookies or using another browser creates a separate history identity.
Keep the instance folder when updating the app: it holds the database and local
session secret. Previously unsaved messages cannot be recovered.

## Render

Render's default filesystem is temporary. For persistent SQLite history, attach
a persistent disk (requires a paid service), with mount path /var/data, then set:

```text
CHAT_DATABASE=/var/data/nova_chats.sqlite3
FLASK_SECRET_KEY=<your own long random secret; keep the same value across deployments>
```

Keep the existing Gemini and Sarvam environment keys. Deploy the new chat_store.py
alongside app.py, templates, and static files. Never upload your instance folder
or .env. Without a persistent disk, Render can erase SQLite history on restart or
redeployment. See https://render.com/docs/disks.

## Checks

Run the new feature checks with:

```powershell
python -m unittest discover -s tests -p test_quiz_history.py -v
```

The older test_gemini_fallback.py in the supplied ZIP references helper functions
that are absent from the supplied app.py; those unrelated legacy tests have not
been rewritten by this update.
