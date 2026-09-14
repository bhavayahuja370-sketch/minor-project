// =========================
// RECENT CHATS
// =========================

const recentChatsButton = document.querySelector('#recentChatsButton');
const recentChatsPanel = document.querySelector('#recentChatsPanel');
const recentChatsList = document.querySelector('#recentChatsList');
const recentChatsEmpty = document.querySelector('#recentChatsEmpty');

function renderRecentChats(history) {
  if (!recentChatsList) return;

  recentChatsList.innerHTML = '';

  if (!Array.isArray(history) || history.length === 0) {
    if (recentChatsEmpty) {
      recentChatsEmpty.style.display = 'block';
    }
    return;
  }

  if (recentChatsEmpty) {
    recentChatsEmpty.style.display = 'none';
  }

  history.forEach(chat => {
    const item = document.createElement('div');

    item.className = 'recent-chat-item';

    const title = document.createElement('div');
    title.className = 'recent-chat-title';
    title.textContent =
      chat.user_message || 'Untitled conversation';

    const time = document.createElement('div');
    time.className = 'recent-chat-time';

    if (chat.created_at) {
      time.textContent = new Date(
        chat.created_at
      ).toLocaleString();
    }

    item.appendChild(title);
    item.appendChild(time);

    item.addEventListener('click', () => {
      messages.innerHTML = '';
      welcome.style.display = 'none';

      addMessage(
        chat.user_message || '',
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
    });

    recentChatsList.appendChild(item);
  });
}


async function refreshRecentChats() {
  if (!recentChatsList) return;

  try {
    const response = await fetch('/api/chat-history', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(
        `History request failed: ${response.status}`
      );
    }

    const data = await response.json();

    console.log('Recent Chats:', data);

    const history = Array.isArray(data)
      ? data
      : Array.isArray(data.history)
        ? data.history
        : [];

    renderRecentChats(history);

  } catch (error) {
    console.error(
      'Failed to load recent chats:',
      error
    );

    renderRecentChats([]);
  }
}


// Open / close Recent Chats
if (recentChatsButton) {
  recentChatsButton.addEventListener('click', async () => {
    if (recentChatsPanel) {
      recentChatsPanel.classList.toggle('open');

      if (
        recentChatsPanel.classList.contains('open')
      ) {
        await refreshRecentChats();
      }
    } else {
      await refreshRecentChats();
    }
  });
}


// Load Recent Chats when page opens
document.addEventListener(
  'DOMContentLoaded',
  () => {
    refreshRecentChats();
  }
);
