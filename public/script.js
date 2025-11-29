// ============================================
// CHAT HISTORY MANAGER
// ============================================
class ChatHistoryManager {
  constructor() {
    this.conversations = this.loadConversations();
    this.currentChatId = null;
  }

  // Generate UUID
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Load conversations from LocalStorage
  loadConversations() {
    const data = localStorage.getItem('aziz_chat_conversations');
    return data ? JSON.parse(data) : [];
  }

  // Save conversations to LocalStorage
  saveConversations() {
    localStorage.setItem('aziz_chat_conversations', JSON.stringify(this.conversations));
  }

  // Create new conversation
  createConversation() {
    const newChat = {
      id: this.generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    };
    this.conversations.unshift(newChat);
    this.currentChatId = newChat.id;
    this.saveConversations();
    return newChat;
  }

  // Get current conversation
  getCurrentConversation() {
    return this.conversations.find(c => c.id === this.currentChatId);
  }

  // Add message to current conversation
  addMessage(role, content, imageUrl = null) {
    const conversation = this.getCurrentConversation();
    if (!conversation) return;

    const message = { role, content, imageUrl, timestamp: Date.now() };
    conversation.messages.push(message);

    // Update title with first user message
    if (role === 'user' && conversation.title === 'New Chat') {
      conversation.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    }

    this.saveConversations();
  }

  // Delete conversation
  deleteConversation(id) {
    this.conversations = this.conversations.filter(c => c.id !== id);
    this.saveConversations();
    
    // If deleted current chat, switch to first or create new
    if (this.currentChatId === id) {
      if (this.conversations.length > 0) {
        this.currentChatId = this.conversations[0].id;
      } else {
        this.createConversation();
      }
    }
  }

  // Switch to conversation
  switchConversation(id) {
    this.currentChatId = id;
  }

  // Get all conversations
  getAllConversations() {
    return this.conversations;
  }
}

// ============================================
// GLOBAL STATE
// ============================================
const chatManager = new ChatHistoryManager();
let selectedFile = null;
let selectedFileDataUrl = null;

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer');
const messagesWrapper = document.getElementById('messagesWrapper');
const welcomeScreen = document.getElementById('welcomeScreen');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const attachBtn = document.getElementById('attachBtn');
const filePreviewDiv = document.getElementById('filePreview');
const conversationsList = document.getElementById('conversationsList');
const newChatBtn = document.getElementById('newChatBtn');

// ============================================
// INITIALIZATION
// ============================================
function init() {
  // Load or create first conversation
  if (chatManager.conversations.length === 0) {
    chatManager.createConversation();
  } else {
    chatManager.currentChatId = chatManager.conversations[0].id;
  }

  renderConversationsList();
  loadCurrentChat();
  setupEventListeners();
}

// ============================================
// CONVERSATION LIST UI
// ============================================
function renderConversationsList() {
  conversationsList.innerHTML = '';
  
  chatManager.getAllConversations().forEach(conversation => {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    if (conversation.id === chatManager.currentChatId) {
      item.classList.add('active');
    }

    item.innerHTML = `
      <svg class="conversation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="conversation-title">${conversation.title}</span>
      <button class="delete-chat-btn" data-id="${conversation.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    // Click to switch conversation
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.delete-chat-btn')) {
        switchToConversation(conversation.id);
      }
    });

    // Delete button
    const deleteBtn = item.querySelector('.delete-chat-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConversation(conversation.id);
    });

    conversationsList.appendChild(item);
  });
}

// ============================================
// CONVERSATION ACTIONS
// ============================================
function createNewChat() {
  chatManager.createConversation();
  renderConversationsList();
  loadCurrentChat();
}

function switchToConversation(id) {
  chatManager.switchConversation(id);
  renderConversationsList();
  loadCurrentChat();
}

function deleteConversation(id) {
  if (confirm('Delete this conversation?')) {
    chatManager.deleteConversation(id);
    renderConversationsList();
    loadCurrentChat();
  }
}

// ============================================
// LOAD CURRENT CHAT
// ============================================
function loadCurrentChat() {
  const conversation = chatManager.getCurrentConversation();
  if (!conversation) return;

  messagesContainer.innerHTML = '';

  if (conversation.messages.length === 0) {
    welcomeScreen.classList.remove('hidden');
  } else {
    welcomeScreen.classList.add('hidden');
    conversation.messages.forEach(msg => {
      displayMessage(msg.role, msg.content, msg.imageUrl);
    });
  }

  scrollToBottom();
}

// ============================================
// MESSAGE DISPLAY
// ============================================
function displayMessage(role, content, imageUrl = null) {
  welcomeScreen.classList.add('hidden');

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? 'A' : '🤖';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  textDiv.textContent = content;

  contentDiv.appendChild(textDiv);

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'message-image';
    img.alt = 'Uploaded image';
    img.onclick = () => window.open(imageUrl, '_blank');
    contentDiv.appendChild(img);
  }

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);

  scrollToBottom();
}

// ============================================
// TYPING INDICATOR
// ============================================
function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typing-indicator';

  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="typing-dots">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;

  messagesContainer.appendChild(typingDiv);
  scrollToBottom();
}

function removeTypingIndicator() {
  const typingDiv = document.getElementById('typing-indicator');
  if (typingDiv) {
    typingDiv.remove();
  }
}

// ============================================
// SEND MESSAGE
// ============================================
async function sendMessage() {
  const message = msgInput.value.trim();

  if (!message && !selectedFile) return;

  const messageText = message || 'Analyze this image';
  const imageUrl = selectedFileDataUrl;

  // Clear input
  msgInput.value = '';
  msgInput.style.height = 'auto';
  removeFilePreview();

  // Display user message
  displayMessage('user', messageText, imageUrl);
  chatManager.addMessage('user', messageText, imageUrl);
  renderConversationsList();

  // Disable send button
  sendBtn.disabled = true;

  // Show typing indicator
  showTypingIndicator();

  try {
    // Prepare request
    const requestBody = { message: messageText };
    if (imageUrl) {
      requestBody.image = imageUrl;
    }

    // Call API
    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // Remove typing indicator
    removeTypingIndicator();

    if (response.ok) {
      displayMessage('assistant', data.reply);
      chatManager.addMessage('assistant', data.reply);
      renderConversationsList();
    } else {
      const errorMsg = `Error: ${data.error || 'Something went wrong'}`;
      displayMessage('assistant', errorMsg);
      chatManager.addMessage('assistant', errorMsg);
    }
  } catch (error) {
    removeTypingIndicator();
    console.error('Error:', error);
    const errorMsg = '❌ Failed to connect to server';
    displayMessage('assistant', errorMsg);
    chatManager.addMessage('assistant', errorMsg);
  } finally {
    sendBtn.disabled = false;
    msgInput.focus();
  }
}

// ============================================
// FILE HANDLING
// ============================================
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB');
    return;
  }

  selectedFile = file;

  const reader = new FileReader();
  reader.onload = (event) => {
    selectedFileDataUrl = event.target.result;
    showFilePreview(file, selectedFileDataUrl);
  };
  reader.readAsDataURL(file);
}

function showFilePreview(file, dataUrl) {
  filePreviewDiv.innerHTML = `
    <img src="${dataUrl}" alt="Preview">
    <div class="file-info">
      <div class="file-name">${file.name}</div>
      <div class="file-size">${formatFileSize(file.size)}</div>
    </div>
    <button class="remove-file" onclick="removeFilePreview()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  filePreviewDiv.style.display = 'flex';
}

function removeFilePreview() {
  selectedFile = null;
  selectedFileDataUrl = null;
  fileInput.value = '';
  filePreviewDiv.style.display = 'none';
  filePreviewDiv.innerHTML = '';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================
// UTILITIES
// ============================================
function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
  });
}

function autoResizeTextarea() {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 200) + 'px';
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // New chat button
  newChatBtn.addEventListener('click', createNewChat);

  // Send button
  sendBtn.addEventListener('click', sendMessage);

  // Enter to send (Shift+Enter for new line)
  msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  msgInput.addEventListener('input', autoResizeTextarea);

  // Attach button
  attachBtn.addEventListener('click', () => fileInput.click());

  // File input
  fileInput.addEventListener('change', handleFileSelect);

  // Focus input
  msgInput.focus();
}

// Make removeFilePreview global
window.removeFilePreview = removeFilePreview;

// ============================================
// START APP
// ============================================
init();
