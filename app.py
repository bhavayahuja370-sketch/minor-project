import os
import re
import random
from datetime import datetime

from flask import Flask, jsonify, render_template, request, session

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "nova-local-development-key")

QUIZ_QUESTIONS = [
    {
        "topic": "Python",
        "question": "What is the output of `len('Nova')`?",
        "options": "A. 3\nB. 4\nC. 5\nD. Error",
        "answer": "B",
        "explanation": "`Nova` has four characters, so `len('Nova')` returns 4.",
    },
    {
        "topic": "HTML",
        "question": "Which HTML tag creates the largest heading by default?",
        "options": "A. `<head>`\nB. `<heading>`\nC. `<h1>`\nD. `<title>`",
        "answer": "C",
        "explanation": "The `<h1>` tag represents the most important heading and is the largest by default.",
    },
    {
        "topic": "CSS",
        "question": "Which CSS property changes the text color?",
        "options": "A. `font-style`\nB. `background`\nC. `color`\nD. `text-size`",
        "answer": "C",
        "explanation": "The `color` property sets the foreground color of text.",
    },
    {
        "topic": "Java",
        "question": "What makes Java code able to run on different operating systems?",
        "options": "A. HTML\nB. JVM (Java Virtual Machine)\nC. CSS\nD. Database",
        "answer": "B",
        "explanation": "Java bytecode runs on the JVM, which is available for different operating systems.",
    },
    {
        "topic": "DBMS",
        "question": "Which is a main purpose of a DBMS?",
        "options": "A. Drawing images\nB. Managing and retrieving data\nC. Styling web pages\nD. Editing videos",
        "answer": "B",
        "explanation": "A DBMS stores, organizes, manages, and retrieves data efficiently.",
    },
    {
        "topic": "JavaScript",
        "question": "Which task is JavaScript commonly used for on a website?",
        "options": "A. Adding interactivity to a button\nB. Creating a physical database server\nC. Replacing HTML structure\nD. Printing a paper document",
        "answer": "A",
        "explanation": "JavaScript responds to user actions and adds interactive behavior to web pages.",
    },
]


def demo_response(message: str, subject: str, level: str) -> str:
    """Helpful offline fallback so the project runs without an API key."""
    text = message.strip()
    lower = text.lower()

    greeting_words = ("hello", "hi", "hey", "good morning", "good afternoon", "good evening")
    if any(re.search(rf"\b{re.escape(word)}\b", lower) for word in greeting_words):
        return (
            "Hello! Welcome to Nova, your technical learning assistant. ✦\n\n"
            "I can help you learn Python, DBMS, HTML, CSS, Java, and JavaScript. "
            "You can ask for a definition, features, characteristics, a simple explanation, a quiz, or a study plan."
        )

    if any(word in lower for word in ("quiz", "test me", "quick quiz", "questions")):
        quiz = random.choice(QUIZ_QUESTIONS)
        session["active_quiz"] = {"answer": quiz["answer"], "explanation": quiz["explanation"]}
        return (
            f"{quiz['topic']} quiz\n\n{quiz['question']}\n\n{quiz['options']}\n\n"
            "Reply with A, B, C, or D and I will check your answer."
        )

    if any(phrase in lower for phrase in ("explain simply", "step by step", "help me understand")):
        return (
            "Here is a simple way to understand technical concepts:\n\n"
            "1. Definition — learn what the term means.\n"
            "2. Purpose — learn why it is used.\n"
            "3. Example — see one small real example.\n"
            "4. Practice — explain it back in your own words.\n\n"
            "Try asking: “Explain Python simply”, “Explain DBMS simply”, “Explain HTML simply”, "
            "“Explain CSS simply”, “Explain Java simply”, or “Explain JavaScript simply”."
        )

    if any(word in lower for word in ("study plan", "study plan for today", "make a study plan")):
        return (
            "Technical study plan — 45 minutes\n\n"
            "• 10 min: Read the definition and key features of one topic.\n"
            "• 10 min: Write three important characteristics in your own words.\n"
            "• 10 min: Review one example (code, tag, or database use case).\n"
            "• 10 min: Take a quiz question without notes.\n"
            "• 5 min: Summarize what you learned and note one doubt.\n\n"
            "Suggested order: HTML → CSS → JavaScript → Python → DBMS → Java."
        )

    if "python" in lower:
        return (
            "Python is a high-level, general-purpose programming language. It is designed to be "
            "easy to read and write.\n\n"
            "Key features:\n"
            "• Simple syntax: code is close to everyday English.\n"
            "• Interpreted: programs run through an interpreter.\n"
            "• Versatile: used in web development, automation, data science, AI, and more.\n"
            "• Large library ecosystem: many ready-made tools are available.\n\n"
            "Example: `print(\"Hello, world!\")` displays text on the screen."
        )
    if "dbms" in lower or "database management" in lower:
        return (
            "A DBMS (Database Management System) is software that stores, organizes, retrieves, "
            "and manages data in a database. Examples include MySQL, Oracle, PostgreSQL, and SQLite.\n\n"
            "Main features:\n"
            "• Data storage and fast retrieval\n"
            "• Security through users and permissions\n"
            "• Reduced duplication of data\n"
            "• Backup and recovery\n"
            "• Multiple users can work with data safely\n\n"
            "For example, a college can use a DBMS to keep student, course, attendance, and result records connected."
        )
    if "html" in lower:
        return (
            "HTML stands for HyperText Markup Language. It provides the structure and content of a web page. "
            "It is a markup language, not a programming language.\n\n"
            "A basic HTML page contains:\n"
            "• `<html>`: the whole document\n"
            "• `<head>`: page information, title, and links to CSS\n"
            "• `<body>`: visible page content\n\n"
            "Common tags include `<h1>` for a heading, `<p>` for a paragraph, `<a>` for a link, and `<img>` for an image."
        )
    if "css" in lower:
        return (
            "CSS stands for Cascading Style Sheets. It controls how HTML content looks: colors, fonts, spacing, layouts, and animations.\n\n"
            "CSS can be added in three ways:\n"
            "• Inline CSS: directly on one HTML element\n"
            "• Internal CSS: inside a `<style>` block in an HTML file\n"
            "• External CSS: in a separate `.css` file (best for most projects)\n\n"
            "Example: `h1 { color: purple; }` makes all level-one headings purple."
        )
    if "javascript" in lower:
        return (
            "JavaScript is a programming language that makes web pages interactive. It can react to clicks, validate forms, update content, and communicate with servers.\n\n"
            "Examples of use: interactive menus, calculators, games, chat apps, and live notifications.\n\n"
            "JavaScript and Java are different languages. JavaScript is mainly used in browsers and web applications, while Java is commonly used for enterprise applications, Android development, and backend systems."
        )
    if "java" in lower:
        return (
            "Java is a high-level, object-oriented programming language developed to be portable: its code can run on many systems through the Java Virtual Machine (JVM).\n\n"
            "Main characteristics:\n"
            "• Object-oriented and class-based\n"
            "• Platform independent: “write once, run anywhere”\n"
            "• Secure and reliable\n"
            "• Used for Android apps, enterprise software, web services, and desktop applications\n\n"
            "A simple Java program usually begins in a class with a `main` method."
        )

    return (
        "Sorry, I don't know this topic yet. I can currently help with Python, DBMS, HTML, CSS, "
        "Java, and JavaScript. Please try one of these technical concepts."
    )


def gemini_is_configured() -> bool:
    """Return whether a Gemini key is available without exposing its value."""
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def gemini_response(message: str, subject: str, level: str, local_knowledge: str) -> str | None:
    """Adds a Gemini explanation to the app's built-in technical knowledge."""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    try:
        from google import genai

        client = genai.Client(api_key=key)
        response = client.interactions.create(
            model=os.environ.get("GEMINI_MODEL", "gemini-3.5-flash"),
            input=(
                "You are Nova, a clear and encouraging student assistant. "
                f"Adapt your answer for a {level} learner. Explain {subject} concepts using short "
                "paragraphs or bullets, include a simple example when useful, and do not complete graded work. "
                "When app study notes are supplied, use them as a factual starting point and add useful detail "
                "without repeating them word-for-word.\n\n"
                f"Student question: {message}\n\n"
                f"App study notes:\n{local_knowledge or 'No local study notes are available for this topic.'}"
            ),
        )
        answer = (response.output_text or "").strip()
        if answer:
            app.logger.info("Gemini response received successfully.")
            return answer
        app.logger.warning("Gemini returned an empty response.")
    except Exception as error:
        # Log only the error type; never log an API key or request credentials.
        app.logger.warning("Gemini request failed: %s", type(error).__name__)
        return None

    return None


def openai_is_configured() -> bool:
    """Return whether an OpenAI key is available without exposing its value."""
    return bool(os.getenv("OPENAI_API_KEY", "").strip())


def openai_response(message: str, subject: str, level: str, local_knowledge: str) -> str | None:
    """Calls OpenAI using the same student-assistant framing as the Gemini provider."""
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=key)
        completion = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Nova, a clear and encouraging student assistant. "
                        f"Adapt your answer for a {level} learner. Explain {subject} concepts using short "
                        "paragraphs or bullets, include a simple example when useful, and do not complete "
                        "graded work. When app study notes are supplied, use them as a factual starting "
                        "point and add useful detail without repeating them word-for-word."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Student question: {message}\n\n"
                        f"App study notes:\n{local_knowledge or 'No local study notes are available for this topic.'}"
                    ),
                },
            ],
        )
        answer = (completion.choices[0].message.content or "").strip()
        if answer:
            app.logger.info("OpenAI response received successfully.")
            return answer
        app.logger.warning("OpenAI returned an empty response.")
    except Exception as error:
        # Log only the error type; never log an API key or request credentials.
        app.logger.warning("OpenAI request failed: %s", type(error).__name__)
        return None

    return None


# Registry of selectable AI providers. Adding a provider here (and its
# `*_response` function above) is the only place new models need to be wired in.
AI_PROVIDERS = {
    "gemini": gemini_response,
    "openai": openai_response,
}
DEFAULT_MODEL = "gemini"


def ai_response(model: str, message: str, subject: str, level: str, local_knowledge: str) -> str | None:
    """Calls ONLY the selected provider. Never falls through to the other AI provider —
    on failure the caller is expected to fall back to local data instead."""
    handler = AI_PROVIDERS.get(model, AI_PROVIDERS[DEFAULT_MODEL])
    return handler(message, subject, level, local_knowledge)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    subject = str(data.get("subject", "General"))
    level = str(data.get("level", "High school"))

    # Model selection: use whatever the client sent if valid, otherwise fall back to
    # whichever model this session last used (persists for the session), defaulting to Gemini.
    requested_model = str(data.get("model", "")).strip().lower()
    model = requested_model if requested_model in AI_PROVIDERS else session.get("selected_model", DEFAULT_MODEL)
    session["selected_model"] = model

    if not message:
        return jsonify({"error": "Please enter a question."}), 400

    active_quiz = session.get("active_quiz")
    selected_answer = re.fullmatch(r"\s*([a-dA-D])[.!?\s]*", message)
    if active_quiz and selected_answer:
        selected = selected_answer.group(1).upper()
        correct = active_quiz["answer"]
        session.pop("active_quiz", None)
        if selected == correct:
            answer = f"✓ Correct! The right answer is {correct}.\n\n{active_quiz['explanation']}"
        else:
            answer = f"✗ Wrong. The correct answer is {correct}.\n\n{active_quiz['explanation']}"
    else:
        lower_message = message.lower()
        supported_topics = ("python", "dbms", "database management", "html", "css", "java", "javascript", "sql")
        is_quiz_request = any(word in lower_message for word in ("quiz", "test me", "quick quiz", "questions"))
        is_sql_question = bool(re.search(r"\bsql\b", lower_message))

        # SQL has no local knowledge base entry, so the selected AI model is tried first;
        # if it fails there is no local answer to fall back to for this topic.
        if is_sql_question and not is_quiz_request:
            ai_answer = ai_response(model, message, subject, level, "")
            answer = ai_answer or "Sorry, I couldn't find a reliable answer to that question right now."
        # Selected AI model is the primary source for technical topics; local study notes are
        # only used as a fallback if the AI call fails. The two are never shown together.
        elif any(topic in lower_message for topic in supported_topics) and not is_quiz_request:
            local_answer = demo_response(message, subject, level)
            ai_answer = ai_response(model, message, subject, level, local_answer)
            answer = ai_answer if ai_answer else local_answer
        else:
            # Greetings, quiz generation, and study-plan requests stay fully local — unaffected
            # by model selection, exactly as before.
            answer = demo_response(message, subject, level)
    return jsonify({"reply": answer, "time": datetime.now().strftime("%I:%M %p"), "model": model})


@app.route("/api/flashcards", methods=["POST"])
def flashcards():
    data = request.get_json(silent=True) or {}
    topic = re.sub(r"[^\w\s-]", "", str(data.get("topic", "your topic"))).strip()[:80]
    return jsonify({
        "cards": [
            {"front": f"What is the main idea of {topic}?", "back": "State it in one precise sentence."},
            {"front": f"Give an example of {topic}.", "back": "Choose a clear, real or worked example."},
            {"front": f"Why does {topic} matter?", "back": "Connect it to a wider concept or real use."},
        ]
    })


if __name__ == "__main__":
    print(f"Gemini API key configured: {gemini_is_configured()}")
    print(f"OpenAI API key configured: {openai_is_configured()}")
    app.run(debug=True)
