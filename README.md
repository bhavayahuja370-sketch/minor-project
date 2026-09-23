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
available as a fallback. To get real AI-generated answers, set one or both provider keys as
environment variables before starting (never put keys directly in project files):

```powershell
$env:GEMINI_API_KEY="your-gemini-key"
# optional: $env:GEMINI_MODEL="gemini-3.5-flash"

$env:OPENAI_API_KEY="your-openai-key"
# optional: $env:OPENAI_MODEL="gpt-4o-mini"

python app.py
```

On macOS/Linux use `export GEMINI_API_KEY="your-gemini-key"` etc. instead.

Use the "AI Model" selector in the app header to switch between Gemini and OpenAI. Whichever
model is selected is used exclusively for that question — if it fails (rate limit, quota,
timeout, network error, etc.) the app quietly falls back to its local study notes instead of
calling the other provider or showing a raw error.

Never add your API key to the project files, commit it to source control, or expose it in
frontend/browser code. Both keys are only ever read server-side from environment variables.

## Deploy on Render

Push this project to a Git repository, then create a new **Blueprint** service in Render and select the repository. Render reads `render.yaml`, installs the Python requirements, and starts the Flask app with Gunicorn.

In Render, add `GEMINI_API_KEY` and/or `OPENAI_API_KEY` as environment variables. This version has no data-storage connection and no persistent chat history.
