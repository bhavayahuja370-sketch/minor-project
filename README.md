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

The project works in a useful local demo mode without a key. To use OpenAI, set an environment variable before starting:

```powershell
$env:OPENAI_API_KEY="your-key"
# optional: $env:OPENAI_MODEL="gpt-4o-mini"
python app.py
```

Never add your API key to the project files or share it in source control.
