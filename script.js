
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = "openai/gpt-oss-120b";

// Elements
const messagesEl = document.getElementById("messages");
const chatArea = document.getElementById("chatArea");
const welcome = document.getElementById("welcome");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const settingsOverlay = document.getElementById("settingsOverlay");
const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const rememberKey = document.getElementById("rememberKey");

const toastEl = document.getElementById("toast");
const chatList = document.getElementById("chatList");
const modelDisplay = document.getElementById("modelDisplay");

const newChatButton = document.getElementById("newChat");
const openSettingsButton = document.getElementById("openSettings");
const topSettingsButton = document.getElementById("topSettings");
const closeSettingsButton = document.getElementById("closeSettings");
const saveSettingsButton = document.getElementById("saveSettings");
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");

// State
let conversation = [];
let isLoading = false;
let toastTimer;

let apiKey = sessionStorage.getItem("groq_api_key") || "";
let model = localStorage.getItem("groq_model") || DEFAULT_MODEL;

apiKeyInput.value = apiKey;
modelInput.value = model;
rememberKey.checked = localStorage.getItem("remember_groq_key") === "true";

updateModelDisplay();

// -----------------------------
// SETTINGS
// -----------------------------

function openSettings() {
  apiKeyInput.value = apiKey;
  modelInput.value = model;
  settingsOverlay.classList.add("open");
}

function closeSettings() {
  settingsOverlay.classList.remove("open");
}

function saveSettings() {
  const newKey = apiKeyInput.value.trim();
  const newModel = modelInput.value.trim() || DEFAULT_MODEL;

  apiKey = newKey;
  model = newModel;

  // Remove any previous stored key
  sessionStorage.removeItem("groq_api_key");
  localStorage.removeItem("groq_api_key");

  if (rememberKey.checked) {
    localStorage.setItem("groq_api_key", apiKey);
  } else {
    sessionStorage.setItem("groq_api_key", apiKey);
  }

  localStorage.setItem("remember_groq_key", rememberKey.checked);
  localStorage.setItem("groq_model", model);

  updateModelDisplay();
  closeSettings();
  showToast("Settings saved");
}

function updateModelDisplay() {
  modelDisplay.textContent = model;
}

// -----------------------------
// CHAT
// -----------------------------

function newChat() {
  conversation = [];
  messagesEl.innerHTML = "";
  welcome.style.display = "block";
  chatList.innerHTML = "";

  input.value = "";
  resizeInput();

  closeSidebar();
  input.focus();
}

function sendMessage() {
  const text = input.value.trim();

  if (!text || isLoading) return;

  if (!apiKey) {
    showToast("Add your Groq API key in Settings first.");
    openSettings();
    return;
  }

  input.value = "";
  resizeInput();

  welcome.style.display = "none";

  conversation.push({
    role: "user",
    content: text
  });

  renderMessage("user", text);
  updateChatTitle(text);

  requestGroq();
}

async function requestGroq() {
  isLoading = true;
  updateSendButton();
  showTyping();

  try {
    const requestMessages = [
      {
        role: "system",
        content: "You are a helpful, friendly AI assistant. Be clear, accurate, and conversational. Use readable formatting when helpful."
      },
      ...conversation
    ];

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: requestMessages,
        temperature: 0.7
      })
    });

    removeTyping();

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        `Request failed (${response.status})`;

      throw new Error(message);
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error("The AI returned an empty response.");
    }

    conversation.push({
      role: "assistant",
      content: answer
    });

    renderMessage("assistant", answer);

  } catch (error) {
    removeTyping();

    showToast(error.message || "Something went wrong.");

    // Remove the failed user request from API context.
    if (conversation.length && conversation[conversation.length - 1].role === "user") {
      conversation.pop();
    }

  } finally {
    isLoading = false;
    updateSendButton();
    input.focus();
  }
}

// -----------------------------
// RENDER MESSAGES
// -----------------------------

function renderMessage(role, content) {
  const message = document.createElement("div");
  message.className = "message";

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "user" : "ai"}`;
  avatar.textContent = role === "user" ? "U" : "✦";

  const messageContent = document.createElement("div");
  messageContent.className = "message-content";

  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent = role === "user" ? "You" : "Groq AI";

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = content;

  messageContent.appendChild(name);
  messageContent.appendChild(text);

  message.appendChild(avatar);
  message.appendChild(messageContent);

  messagesEl.appendChild(message);

  scrollToBottom();
}

function showTyping() {
  const typing = document.createElement("div");
  typing.className = "message";
  typing.id = "typingIndicator";

  const avatar = document.createElement("div");
  avatar.className = "avatar ai";
  avatar.textContent = "✦";

  const content = document.createElement("div");
  content.className = "message-content";

  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent = "Groq AI";

  const dots = document.createElement("div");
  dots.className = "typing";
  dots.innerHTML = "<span></span><span></span><span></span>";

  content.appendChild(name);
  content.appendChild(dots);

  typing.appendChild(avatar);
  typing.appendChild(content);

  messagesEl.appendChild(typing);
  scrollToBottom();
}

function removeTyping() {
  const typing = document.getElementById("typingIndicator");
  if (typing) typing.remove();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

// -----------------------------
// CHAT TITLE
// -----------------------------

function updateChatTitle(text) {
  if (chatList.children.length > 0) return;

  const title = document.createElement("div");
  title.className = "chat-history-item active";
  title.textContent = text.length > 32
    ? text.slice(0, 32) + "..."
    : text;

  chatList.appendChild(title);
}

// -----------------------------
// INPUT
// -----------------------------

function resizeInput() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
}

function updateSendButton() {
  sendButton.disabled = isLoading || !input.value.trim();
}

input.addEventListener("input", () => {
  resizeInput();
  updateSendButton();
});

// Enter sends.
// Shift + Enter inserts a new line.
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage();
  }
});

sendButton.addEventListener("click", sendMessage);

// -----------------------------
// SUGGESTIONS
// -----------------------------

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt || "";
    resizeInput();
    updateSendButton();
    input.focus();
  });
});

// -----------------------------
// SETTINGS EVENTS
// -----------------------------

openSettingsButton.addEventListener("click", openSettings);
topSettingsButton.addEventListener("click", openSettings);
closeSettingsButton.addEventListener("click", closeSettings);
saveSettingsButton.addEventListener("click", saveSettings);

settingsOverlay.addEventListener("click", (event) => {
  if (event.target === settingsOverlay) {
    closeSettings();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSettings();
    closeSidebar();
  }
});

// -----------------------------
// NEW CHAT
// -----------------------------

newChatButton.addEventListener("click", newChat);

// -----------------------------
// MOBILE SIDEBAR
// -----------------------------

menuButton.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

function closeSidebar() {
  sidebar.classList.remove("open");
}

// -----------------------------
// TOAST
// -----------------------------

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3200);
}

// -----------------------------
// INITIALIZATION
// -----------------------------

updateSendButton();
resizeInput();
