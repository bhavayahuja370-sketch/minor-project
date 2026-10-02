const chatForm = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const messages = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const subject = document.querySelector('#subject');
const level = document.querySelector('#level');
const themeToggle = document.querySelector('#themeToggle');
let activeAudio = null;
let activeSpeakButton = null;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('nova-theme', theme);
  const dark = theme === 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
  themeToggle.title = themeToggle.getAttribute('aria-label');
}

setTheme(localStorage.getItem('nova-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

function addMessage(text, role, typing = false) {
  const item = document.createElement('div');
  item.className = `message ${role}${typing ? ' typing' : ''} message-enter`;
  if (role === 'assistant') item.innerHTML = '<div class="bot-avatar">✦</div>';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  item.appendChild(bubble);
  if (role === 'assistant' && !typing && text) {
    const speakButton = document.createElement('button');
    speakButton.className = 'speak-button';
    speakButton.type = 'button';
    speakButton.textContent = '🔊 Speak';
    speakButton.setAttribute('aria-label', 'Speak Nova’s answer');
    speakButton.addEventListener('click', () => speakReply(text, speakButton));
    item.appendChild(speakButton);
  }
  messages.appendChild(item);
  item.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return item;
}

function resetSpeechControls() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  if (activeSpeakButton) {
    activeSpeakButton.textContent = '🔊 Speak';
    activeSpeakButton.setAttribute('aria-label', 'Speak Nova’s answer');
  }
  activeAudio = null;
  activeSpeakButton = null;
}

async function speakReply(text, button) {
  if (activeSpeakButton === button) {
    resetSpeechControls();
    return;
  }

  resetSpeechControls();
  button.textContent = 'Preparing…';
  button.disabled = true;

  try {
    if (!window.puter?.ai?.txt2speech) {
      throw new Error('Text-to-speech is unavailable. Check your internet connection and try again.');
    }

    const audio = await window.puter.ai.txt2speech(text.slice(0, 3000), {
      provider: 'aws-polly',
      voice: 'Joanna',
      engine: 'neural',
      language: 'en-US'
    });

    activeAudio = audio;
    activeSpeakButton = button;
    button.textContent = '■ Stop';
    button.setAttribute('aria-label', 'Stop speaking Nova’s answer');
    audio.addEventListener('ended', resetSpeechControls, { once: true });
    await audio.play();
  } catch (error) {
    console.error('Text-to-speech failed:', error);
    button.textContent = 'Speech unavailable';
    window.setTimeout(() => {
      if (button !== activeSpeakButton) button.textContent = '🔊 Speak';
    }, 2200);
  } finally {
    button.disabled = false;
  }
}

async function sendMessage(value) {
  const text = value.trim();
  if (!text) return;
  welcome.style.display = 'none';
  addMessage(text, 'user');
  input.value = ''; input.style.height = 'auto';
  const indicator = addMessage('Nova is thinking…', 'assistant', true);
  try {
    const res = await fetch('/api/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message: text, subject: subject.value, level: level.value})});
    const data = await res.json();
    indicator.remove();
    addMessage(data.reply || data.error || 'I could not generate a response.', 'assistant');
  } catch (_) {
    indicator.remove(); addMessage('I’m having trouble connecting. Please try again.', 'assistant');
  }
}

chatForm.addEventListener('submit', e => { e.preventDefault(); sendMessage(input.value); });
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => sendMessage(button.dataset.prompt)));
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatForm.requestSubmit(); }});
document.querySelector('#newChat').addEventListener('click', () => { messages.innerHTML = ''; welcome.style.display = ''; input.focus(); });

const modal = document.querySelector('#flashcardModal');
document.querySelector('#flashcardButton').addEventListener('click', () => modal.showModal());
document.querySelector('#closeModal').addEventListener('click', () => modal.close());
document.querySelector('#flashcardForm').addEventListener('submit', async e => {
  e.preventDefault(); const topic = document.querySelector('#flashcardTopic').value;
  const res = await fetch('/api/flashcards', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({topic})});
  const data = await res.json();
  document.querySelector('#cards').innerHTML = data.cards.map(card => `<div class="flashcard"><strong>${card.front}</strong><span>${card.back}</span></div>`).join('');
});
