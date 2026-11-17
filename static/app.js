const chatForm = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const messages = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const subject = document.querySelector('#subject');
const level = document.querySelector('#level');
const themeToggle = document.querySelector('#themeToggle');
const voiceButton = document.querySelector('#voiceButton');
let activeAudio = null;
let activeSpeakButton = null;
let mediaRecorder = null;
let microphoneStream = null;
let recordingChunks = [];
let conversationId = null;
let chatBusy = false;

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
  if (!text || chatBusy) return;
  chatBusy = true;
  welcome.style.display = 'none';
  addMessage(text, 'user');
  input.value = ''; input.style.height = 'auto';
  const indicator = addMessage('Nova is thinking…', 'assistant', true);
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, subject: subject.value, level: level.value, conversation_id: conversationId }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'The server could not answer this question.');
    conversationId = data.conversation_id;
    indicator.remove();
    addMessage(data.reply || data.error || 'I could not generate a response.', 'assistant');
  } catch (error) {
    indicator.remove();
    addMessage(error.message || 'I’m having trouble connecting. Please try again.', 'assistant');
  } finally {
    chatBusy = false;
  }
}

function updateVoiceButton(state) {
  const labels = {
    ready: ['🎙', 'Start voice input'],
    recording: ['■', 'Stop recording'],
    working: ['…', 'Turning voice into text']
  };
  const [icon, label] = labels[state];
  voiceButton.textContent = icon;
  voiceButton.setAttribute('aria-label', label);
  voiceButton.title = label;
  voiceButton.classList.toggle('recording', state === 'recording');
  voiceButton.disabled = state === 'working';
}

function stopMicrophone() {
  microphoneStream?.getTracks().forEach(track => track.stop());
  microphoneStream = null;
}

async function transcribeRecording() {
  updateVoiceButton('working');
  const type = mediaRecorder?.mimeType || 'audio/webm';
  const recording = new Blob(recordingChunks, { type });
  recordingChunks = [];

  try {
    const formData = new FormData();
    formData.append('audio', recording, 'nova-recording.webm');
    const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok || !data.transcript) throw new Error(data.error || 'Voice input failed.');

    input.value = data.transcript;
    input.dispatchEvent(new Event('input'));
    chatForm.requestSubmit();
  } catch (error) {
    console.error('Speech-to-text failed:', error);
    addMessage(error.message || 'I could not turn that recording into text. Please try again.', 'assistant');
  } finally {
    mediaRecorder = null;
    updateVoiceButton('ready');
  }
}

async function toggleVoiceInput() {
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.stop();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    addMessage('Voice input is not supported by this browser. Please use a recent Chrome, Edge, or Firefox browser.', 'assistant');
    return;
  }

  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    mediaRecorder = new MediaRecorder(microphoneStream, mimeType ? { mimeType } : undefined);
    recordingChunks = [];
    mediaRecorder.addEventListener('dataavailable', event => {
      if (event.data.size) recordingChunks.push(event.data);
    });
    mediaRecorder.addEventListener('stop', () => {
      stopMicrophone();
      transcribeRecording();
    }, { once: true });
    mediaRecorder.start();
    updateVoiceButton('recording');
  } catch (error) {
    console.error('Microphone access failed:', error);
    stopMicrophone();
    updateVoiceButton('ready');
    addMessage('Please allow microphone permission in your browser, then try voice input again.', 'assistant');
  }
}

chatForm.addEventListener('submit', e => { e.preventDefault(); sendMessage(input.value); });
voiceButton.addEventListener('click', toggleVoiceInput);
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => sendMessage(button.dataset.prompt)));
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatForm.requestSubmit(); } });
document.querySelector('#newChat').addEventListener('click', () => {
  if (chatBusy || mediaRecorder) return;
  resetSpeechControls();
  conversationId = null;
  messages.innerHTML = '';
  welcome.style.display = '';
  input.value = '';
  input.focus();
});
document.querySelector('#mobileNewChat').addEventListener('click', () => document.querySelector('#newChat').click());
document.querySelector('#mobileRecentChats').addEventListener('click', () => document.querySelector('#recentChats').click());

const historyModal = document.querySelector('#historyModal');
const historyList = document.querySelector('#historyList');
window.setInterval(() => {
  if (historyModal.open && !chatBusy && !mediaRecorder) document.querySelector('#recentChats').click();
}, 60000);
document.querySelector('#closeHistory').addEventListener('click', () => historyModal.close());
document.querySelector('#recentChats').addEventListener('click', async () => {
  if (chatBusy || mediaRecorder) return;
  historyModal.showModal();
  historyList.textContent = 'Loading recent chats…';
  try {
    const res = await fetch('/api/conversations');
    if (!res.ok) throw new Error('Could not load recent chats. Please try again.');
    const data = await res.json();
    historyList.replaceChildren();
    if (!data.conversations.length) historyList.textContent = 'No saved chats yet. Send your first message to start.';
    for (const conversation of data.conversations) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-entry';
      button.textContent = conversation.title;
      const date = document.createElement('small');
      date.textContent = new Date(conversation.updated_at).toLocaleString();
      button.appendChild(date);
      button.addEventListener('click', () => openConversation(conversation.id));
      historyList.appendChild(button);
    }
  } catch (error) {
    historyList.textContent = error.message;
  }
});

async function openConversation(id) {
  if (chatBusy) return;
  chatBusy = true;
  try {
    const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Could not open this conversation. Close and reopen Recent chats.');
    const data = await res.json();
    resetSpeechControls();
    messages.replaceChildren();
    welcome.style.display = 'none';
    conversationId = data.id;
    subject.value = data.subject;
    level.value = data.level;
    for (const message of data.messages) addMessage(message.content, message.role);
    historyModal.close();
    input.value = '';
    input.focus();
  } catch (error) {
    historyList.textContent = error.message;
  } finally {
    chatBusy = false;
  }
}

const modal = document.querySelector('#flashcardModal');
document.querySelector('#flashcardButton').addEventListener('click', () => modal.showModal());
document.querySelector('#closeModal').addEventListener('click', () => modal.close());
document.querySelector('#flashcardForm').addEventListener('submit', async e => {
  e.preventDefault(); const topic = document.querySelector('#flashcardTopic').value;
  const res = await fetch('/api/flashcards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
  const data = await res.json();
  document.querySelector('#cards').innerHTML = data.cards.map(card => `<div class="flashcard"><strong>${card.front}</strong><span>${card.back}</span></div>`).join('');
});
