const chatForm = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const messages = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const subject = document.querySelector('#subject');
const level = document.querySelector('#level');
const themeToggle = document.querySelector('#themeToggle');

const modelSelect =
  document.querySelector('#model') ||
  document.querySelector('#modelSelect');

const recentChatsButton = document.querySelector('#recentChatsButton');
const recentChatsPanel = document.querySelector('#recentChatsPanel');
const recentChatsList = document.querySelector('#recentChatsList');
const recentChatsEmpty = document.querySelector('#recentChatsEmpty');


// =========================
// THEME
// =========================

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('nova-theme', theme);

  if (themeToggle) {
    const dark = theme === 'dark';
    const label = `Switch to ${dark ? 'light' : 'dark'} mode`;

    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
  }
}

setTheme(
  localStorage.getItem('nova-theme') ||
  (matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light')
);

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    setTheme(
      document.documentElement.dataset.theme === 'dark'
        ? 'light'
        : 'dark'
    );
  });
}


// =========================
// MODEL SELECTION
// =========================

const savedModel = sessionStorage.getItem('stars-model');

if (modelSelect && savedModel) {
  modelSelect.value = savedModel;
}

if (modelSelect) {
  modelSelect.addEventListener('change', () => {
    sessionStorage.setItem('stars-model', modelSelect.value);
  });
}


// =========================
// ADD MESSAGE
// =========================

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


// =========================
// RECENT CHATS
// =========================

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

  history.forEach(chat => {
    const item = document.createElement('button');

    item.type = 'button';
    item.className = 'recent-chat-item';

    const title =
      chat.user_message ||
      chat.message ||
      'Untitled chat';

    const date = chat.created_at
      ? new Date(chat.created_at).toLocaleString()
      : '';

    item.innerHTML = `
      <span class="recent-chat-title"></span>
      <small class="recent-chat-time"></small>
    `;

    item.querySelector('.recent-chat-title').textContent = title;
    item.querySelector('.recent-chat-time').textContent = date;

    item.addEventListener('click', () => {
      messages.innerHTML = '';
      welcome.style.display = 'none';

      addMessage(
        chat.user_message || chat.message || '',
        'user'
      );

      if (chat.assistant_response) {
        addMessage(
          chat.assistant_response,
          'assistant'
        );
      }

      if (recentChatsPanel) {
        recentChatsPanel.classList.remove('open');
      }

      input.focus();
    });

    recentChatsList.appendChild(item);
  });
}


async function refreshRecentChats() {
  if (!recentChatsList) return;

  try {
    const res = await fetch('/api/chat-history', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`History request failed: ${res.status}`);
    }

    const data = await res.json();

    console.log('Recent Chats:', data);

    const history = Array.isArray(data)
      ? data
      : Array.isArray(data.history)
        ? data.history
        : [];

    renderRecentChats(history);

  } catch (error) {
    console.error('Could not load recent chats:', error);

    renderRecentChats([]);
  }
}


if (recentChatsButton && recentChatsPanel) {
  recentChatsButton.addEventListener('click', async () => {
    recentChatsPanel.classList.toggle('open');

    if (recentChatsPanel.classList.contains('open')) {
      await refreshRecentChats();
    }
  });
}


// =========================
// SEND MESSAGE
// =========================

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
    const payload = {
      message: text,
      subject: subject ? subject.value : 'General',
      level: level ? level.value : 'High school'
    };

    if (modelSelect && modelSelect.value) {
      payload.model = modelSelect.value;
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    indicator.remove();

    if (!res.ok) {
      addMessage(
        data.error ||
        'I could not generate a response.',
        'assistant'
      );

      return;
    }

    addMessage(
      data.reply ||
      data.error ||
      'I could not generate a response.',
      'assistant'
    );

    // IMPORTANT:
    // Wait for the database history request after saving
    // the new chat.
    await refreshRecentChats();

  } catch (error) {
    console.error('Chat error:', error);

    indicator.remove();

    addMessage(
      'I’m having trouble connecting. Please try again.',
      'assistant'
    );
  }
}


// =========================
// CHAT FORM
// =========================

if (chatForm) {
  chatForm.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage(input.value);
  });
}


// =========================
// QUICK PROMPTS
// =========================

document.querySelectorAll('[data-prompt]').forEach(button => {
  button.addEventListener('click', () => {
    sendMessage(button.dataset.prompt);
  });
});


// =========================
// TEXTAREA AUTO RESIZE
// =========================

if (input) {
  input.addEventListener('input', () => {
    input.style.height = 'auto';

    input.style.height =
      Math.min(input.scrollHeight, 120) + 'px';
  });


  // =========================
  // ENTER TO SEND
  // =========================

  input.addEventListener('keydown', event => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (chatForm) {
        chatForm.requestSubmit();
      }
    }
  });
}


// =========================
// NEW CHAT
// =========================

const newChatButton = document.querySelector('#newChat');

if (newChatButton) {
  newChatButton.addEventListener('click', () => {
    messages.innerHTML = '';

    welcome.style.display = '';

    input.value = '';
    input.style.height = 'auto';

    input.focus();
  });
}


// =========================
// FLASHCARDS
// =========================

const modal = document.querySelector('#flashcardModal');
const flashcardButton = document.querySelector('#flashcardButton');
const closeModal = document.querySelector('#closeModal');
const flashcardForm = document.querySelector('#flashcardForm');

if (flashcardButton && modal) {
  flashcardButton.addEventListener('click', () => {
    modal.showModal();
  });
}

if (closeModal && modal) {
  closeModal.addEventListener('click', () => {
    modal.close();
  });
}

if (flashcardForm) {
  flashcardForm.addEventListener('submit', async event => {
    event.preventDefault();

    const topic =
      document.querySelector('#flashcardTopic').value;

    try {
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
        (data.cards || [])
          .map(card => `
            <div class="flashcard">
              <strong></strong>
              <span></span>
            </div>
          `)
          .join('');

      const cards =
        document.querySelectorAll('#cards .flashcard');

      (data.cards || []).forEach((card, index) => {
        cards[index].querySelector('strong').textContent =
          card.front;

        cards[index].querySelector('span').textContent =
          card.back;
      });

    } catch (error) {
      console.error('Flashcard error:', error);
    }
  });
}


// =========================
// LOAD RECENT CHATS ON START
// =========================

document.addEventListener('DOMContentLoaded', () => {
  refreshRecentChats();
});
