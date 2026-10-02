# Nova — AI Student Assistant

An attractive, responsive student-support chatbot built with Python, Flask, HTML, CSS, and JavaScript.

## Run locally

```powershell
cd C:\Users\bhava\Documents\Codex\2026-08-12\i\outputs\student-ai-assistant
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000` in your browser.

## Optional real AI responses

The project works in a useful local demo mode without any key — local study notes are always
available as a fallback. To get real AI-generated answers, set the Gemini provider key as an
environment variables before starting (never put keys directly in project files):

```powershell
$env:GEMINI_API_KEY="your-gemini-key"
# optional: $env:GEMINI_MODEL="gemini-3.5-flash"

python app.py
```

On macOS/Linux use `export GEMINI_API_KEY="your-gemini-key"` etc. instead.

Gemini is used for supported technical questions. If it fails because of a rate limit, quota,
timeout, or network error, the app quietly falls back to its local study notes rather than
showing a raw error.

Never add your API key to the project files, commit it to source control, or expose it in
frontend/browser code. The Gemini key is only ever read server-side from environment variables.

## Text to speech

Each Nova response has a **Speak** button. It uses Puter.js in the browser, so no extra Python
package or API key is required for speech. The application must be opened through Flask or another
HTTP server, not directly as a `file://` URL.

## Deploy on Render

Push this project to a Git repository, then create a new **Blueprint** service in Render and select the repository. Render reads `render.yaml`, installs the Python requirements, and starts the Flask app with Gunicorn.

In Render, add `GEMINI_API_KEY` as an environment variable. This version has no data-storage connection and no persistent chat history.
