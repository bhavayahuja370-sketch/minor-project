const chatForm = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const messages = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const subject = document.querySelector('#subject');
const level = document.querySelector('#level');
const themeToggle = document.querySelector('#themeToggle');
const modelSelect = document.querySelector('#modelSelect');

// Remember the selected AI model for the current browser session only.
modelSelect.value = sessionStorage.getItem('nova-model') || 'gemini';

modelSelect.addEventListener('change', () => {
    sessionStorage.setItem('nova-model', modelSelect.value);
});

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('nova-theme', theme);

    const dark = theme === 'dark';

    themeToggle.setAttribute(
        'aria-label',
        `Switch to ${dark ? 'light' : 'dark'} mode`
    );

    themeToggle.title = themeToggle.getAttribute('aria-label');
}

setTheme(
    localStorage.getItem('nova-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);

themeToggle.addEventListener('click', () => {
    setTheme(
        document.documentElement.dataset.theme === 'dark'
            ? 'light'
            : 'dark'
    );
});

function addMessage(text, role, typing = false) {
    const item = document.createElement('div');

    item.className =
        `message ${role}${typing ? ' typing' : ''} message-enter`;

    if (role === 'assistant') {
        item.innerHTML = '<div class="bot-avatar">✦</div>';
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;

    item.appendChild(bubble);
    messages.appendChild(item);

    item.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
    });

    return item;
}

async function sendMessage(value) {
    const text = value.trim();

    if (!text) return;

    welcome.style.display = 'none';

    addMessage(text, 'user');

    input.value = '';
    input.style.height = 'auto';

    const indicator = addMessage(
        'Nova is thinking…',
        'assistant',
        true
    );

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: text,
                subject: subject.value,
                level: level.value,
                model: modelSelect.value
            })
        });

        const data = await res.json();

        indicator.remove();

        addMessage(
            data.reply ||
            data.error ||
            'I could not generate a response.',
            'assistant'
        );

        // Refresh Recent Chats after a successful response.
        if (data.reply) {
            await refreshRecentChats();
        }

    } catch (error) {
        console.error('Chat error:', error);

        indicator.remove();

        addMessage(
            'I’m having trouble connecting. Please try again.',
            'assistant'
        );
    }
}


// =====================================================
// Recent Chats (backed by /api/chat-history)
// =====================================================

const recentChatsButton =
    document.querySelector('#recentChatsButton');

const recentChatsPanel =
    document.querySelector('#recentChatsPanel');

const recentChatsList =
    document.querySelector('#recentChatsList');

const recentChatsEmpty =
    document.querySelector('#recentChatsEmpty');


function renderRecentChats(history) {
    if (!recentChatsList) return;

    recentChatsList.innerHTML = '';

    if (!Array.isArray(history) || history.length === 0) {
        if (recentChatsEmpty) {
            recentChatsEmpty.style.display = '';
        }

        return;
    }

    if (recentChatsEmpty) {
        recentChatsEmpty.style.display = 'none';
    }

    history.forEach(item => {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'recent-item';

        const snippet = document.createElement('span');

        snippet.className = 'recent-snippet';

        snippet.textContent =
            item.user_message || 'New chat';

        const time = document.createElement('span');

        time.className = 'recent-time';

        if (item.created_at) {
            const date = new Date(item.created_at);

            time.textContent =
                isNaN(date.getTime())
                    ? ''
                    : date.toLocaleString();
        }

        button.appendChild(snippet);
        button.appendChild(time);

        button.addEventListener('click', () => {
            welcome.style.display = 'none';

            messages.innerHTML = '';

            addMessage(
                item.user_message || '',
                'user'
            );

            addMessage(
                item.assistant_response || '',
                'assistant'
            );

            if (recentChatsPanel) {
                recentChatsPanel.hidden = true;
            }

            if (recentChatsButton) {
                recentChatsButton.setAttribute(
                    'aria-expanded',
                    'false'
                );
            }
        });

        recentChatsList.appendChild(button);
    });
}


async function refreshRecentChats() {
    if (!recentChatsList) return;

    try {
        const res = await fetch('/api/chat-history', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-store'
        });

        if (!res.ok) {
            console.error(
                'Chat history request failed:',
                res.status
            );

            return;
        }

        const data = await res.json();

        console.log('Recent chats data:', data);

        /*
         * Supports both backend formats:
         *
         * {
         *     "history": [...]
         * }
         *
         * OR
         *
         * [...]
         */
        const history = Array.isArray(data)
            ? data
            : Array.isArray(data.history)
                ? data.history
                : [];

        renderRecentChats(history);

    } catch (error) {
        console.error(
            'Could not load recent chats:',
            error
        );
    }
}


// Open / close Recent Chats
if (recentChatsButton && recentChatsPanel) {
    recentChatsButton.addEventListener('click', async () => {
        const opening = recentChatsPanel.hidden;

        recentChatsPanel.hidden = !opening;

        recentChatsButton.setAttribute(
            'aria-expanded',
            String(opening)
        );

        if (opening) {
            await refreshRecentChats();
        }
    });
}


// Load Recent Chats when page loads
document.addEventListener('DOMContentLoaded', () => {
    refreshRecentChats();
});


// =====================================================
// Existing Chat Controls
// =====================================================

chatForm.addEventListener('submit', e => {
    e.preventDefault();
    sendMessage(input.value);
});


document
    .querySelectorAll('[data-prompt]')
    .forEach(button => {
        button.addEventListener('click', () => {
            sendMessage(button.dataset.prompt);
        });
    });


input.addEventListener('input', () => {
    input.style.height = 'auto';

    input.style.height =
        Math.min(input.scrollHeight, 120) + 'px';
});


input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.requestSubmit();
    }
});


document
    .querySelector('#newChat')
    .addEventListener('click', () => {
        messages.innerHTML = '';
        welcome.style.display = '';
        input.focus();
    });


// =====================================================
// Flashcards
// =====================================================

const modal =
    document.querySelector('#flashcardModal');

document
    .querySelector('#flashcardButton')
    .addEventListener('click', () => {
        modal.showModal();
    });


document
    .querySelector('#closeModal')
    .addEventListener('click', () => {
        modal.close();
    });


document
    .querySelector('#flashcardForm')
    .addEventListener('submit', async e => {
        e.preventDefault();

        const topic =
            document.querySelector('#flashcardTopic').value;

        const res = await fetch('/api/flashcards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic
            })
        });

        const data = await res.json();

        document.querySelector('#cards').innerHTML =
            data.cards
                .map(card => `
                    <div class="flashcard">
                        <strong>${card.front}</strong>
                        <span>${card.back}</span>
                    </div>
                `)
                .join('');
    });
