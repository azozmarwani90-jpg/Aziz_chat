// ============================================
// CHAT STORAGE MANAGER
// ============================================
const STORAGE_KEY = 'aziz_chats';
const CURRENT_CHAT_KEY = 'aziz_current_chat_id';

// Load chats from localStorage
function loadChatsFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Save chats to localStorage
function saveChatsToStorage(chats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

// Load current chat ID
function loadCurrentChatId() {
  return localStorage.getItem(CURRENT_CHAT_KEY);
}

// Save current chat ID
function saveCurrentChatId(chatId) {
  localStorage.setItem(CURRENT_CHAT_KEY, chatId);
}

// Generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// GLOBAL STATE
// ============================================
let chats = [];
let currentChatId = null;
let selectedFile = null;
let selectedFileDataUrl = null;
let currentImageBase64 = null;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const conversationsList = document.getElementById('conversationsList');
const newChatBtn = document.getElementById('newChatBtn');
const messagesContainer = document.getElementById('messagesContainer');
const messagesWrapper = document.getElementById('messagesWrapper');
const chatContainer = document.getElementById('chatContainer');
const welcomeScreen = document.getElementById('welcomeScreen');
const chatTitle = document.getElementById('chatTitle');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const attachBtn = document.getElementById('attachBtn');
const filePreviewDiv = document.getElementById('filePreview');

// ============================================
// INITIALIZATION
// ============================================
function init() {
  chats = loadChatsFromStorage();
  
  // If no chats exist, create first one
  if (chats.length === 0) {
    startNewChat();
  } else {
    // Load last active chat or first one
    const savedChatId = loadCurrentChatId();
    const chatExists = chats.find(c => c.id === savedChatId);
    currentChatId = chatExists ? savedChatId : chats[0].id;
  }
  
  renderSidebar();
  loadChat(currentChatId);
  setupEventListeners();
}

// ============================================
// SIDEBAR MANAGEMENT
// ============================================
function renderSidebar() {
  conversationsList.innerHTML = '';
  
  chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    if (chat.id === currentChatId) {
      item.classList.add('active');
    }
    
    const title = chat.title || 'New chat';
    const timestamp = formatTimestamp(chat.created_at);
    
    item.innerHTML = `
      <div class="conversation-item-header">
        <svg class="conversation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="conversation-title">${title}</span>
        <button class="delete-chat-btn" data-id="${chat.id}" title="Delete chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      <div class="conversation-timestamp">${timestamp}</div>
    `;
    
    // Click to switch chat
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.delete-chat-btn')) {
        setActiveChat(chat.id);
        closeSidebar(); // Close on mobile after selection
      }
    });
    
    // Delete button
    const deleteBtn = item.querySelector('.delete-chat-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    });
    
    conversationsList.appendChild(item);
  });
}

// Toggle sidebar (mobile)
function toggleSidebar() {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('active');
  hamburgerBtn.classList.toggle('active');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  hamburgerBtn.classList.remove('active');
}

// ============================================
// CHAT MANAGEMENT
// ============================================
function startNewChat() {
  const newChat = {
    id: generateUUID(),
    title: 'New chat',
    messages: [],
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  chats.unshift(newChat);
  saveChatsToStorage(chats);
  setActiveChat(newChat.id);
}

function setActiveChat(chatId) {
  currentChatId = chatId;
  saveCurrentChatId(chatId);
  renderSidebar();
  loadChat(chatId);
}

function loadChat(chatId) {
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;
  
  // Clear messages container
  messagesContainer.innerHTML = '';
  
  // Update title
  chatTitle.textContent = chat.title || 'Aziz Chat';
  
  // Show welcome or messages
  if (chat.messages.length === 0) {
    welcomeScreen.classList.remove('hidden');
  } else {
    welcomeScreen.classList.add('hidden');
    renderChatMessages(chat);
  }
  
  scrollToBottom();
}

function renderChatMessages(chat) {
  chat.messages.forEach(msg => {
    displayMessage(msg.role, msg.content, msg.image);
  });
}

function deleteChat(chatId) {
  if (chats.length === 1) {
    alert('Cannot delete the last chat. Create a new one first.');
    return;
  }
  
  if (!confirm('Delete this conversation?')) return;
  
  chats = chats.filter(c => c.id !== chatId);
  saveChatsToStorage(chats);
  
  // If deleted current chat, switch to first available
  if (currentChatId === chatId) {
    setActiveChat(chats[0].id);
  } else {
    renderSidebar();
  }
}

// ============================================
// MESSAGE DISPLAY
// ============================================
function displayMessage(role, content, imageBase64 = null) {
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
  
  if (imageBase64) {
    const img = document.createElement('img');
    img.src = imageBase64;
    img.className = 'message-image';
    img.alt = 'Uploaded image';
    img.onclick = () => window.open(imageBase64, '_blank');
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
  
  if (!message && !currentImageBase64) return;
  
  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;
  
  const messageText = message || 'Analyze this image';
  const imageBase64 = currentImageBase64;
  
  // Clear input
  msgInput.value = '';
  msgInput.style.height = 'auto';
  removeFilePreview();
  
  // Add user message to chat
  const userMessage = {
    role: 'user',
    content: messageText,
    image: imageBase64,
    created_at: Date.now()
  };
  chat.messages.push(userMessage);
  
  // Update chat title if it's the first message
  if (chat.title === 'New chat') {
    chat.title = messageText.substring(0, 30) + (messageText.length > 30 ? '...' : '');
  }
  
  chat.updated_at = Date.now();
  saveChatsToStorage(chats);
  
  // Display user message
  displayMessage('user', messageText, imageBase64);
  renderSidebar();
  
  // Disable send button
  sendBtn.disabled = true;
  
  // Show typing indicator
  showTypingIndicator();
  
  try {
    // Prepare request body
    const requestBody = {
      user_id: 'default',
      message: messageText
    };
    
    // Only include image if present
    if (imageBase64) {
      requestBody.image = imageBase64;
    }
    
    // Call API
    const response = await fetch('https://aziz-chat.onrender.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    // Remove typing indicator
    removeTypingIndicator();
    
    if (response.ok) {
      const assistantMessage = {
        role: 'assistant',
        content: data.reply,
        created_at: Date.now()
      };
      chat.messages.push(assistantMessage);
      chat.updated_at = Date.now();
      saveChatsToStorage(chats);
      
      displayMessage('assistant', data.reply);
      renderSidebar();
    } else {
      const errorMsg = `Error: ${data.error || 'Something went wrong'}`;
      const errorMessage = {
        role: 'assistant',
        content: errorMsg,
        created_at: Date.now()
      };
      chat.messages.push(errorMessage);
      saveChatsToStorage(chats);
      
      displayMessage('assistant', errorMsg);
    }
  } catch (error) {
    removeTypingIndicator();
    console.error('Error:', error);
    const errorMsg = '❌ Failed to connect to server';
    
    const errorMessage = {
      role: 'assistant',
      content: errorMsg,
      created_at: Date.now()
    };
    chat.messages.push(errorMessage);
    saveChatsToStorage(chats);
    
    displayMessage('assistant', errorMsg);
  } finally {
    sendBtn.disabled = false;
    msgInput.focus();
  }
}

// ============================================
// FILE HANDLING
// ============================================
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB');
    return;
  }
  
  selectedFile = file;
  
  // Convert to Base64 for both display and sending
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64String = e.target.result;
    selectedFileDataUrl = base64String;
    currentImageBase64 = base64String;
    showFilePreview(file, base64String);
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
  currentImageBase64 = null;
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
    chatContainer.scrollTop = chatContainer.scrollHeight;
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
  // Hamburger menu toggle
  hamburgerBtn.addEventListener('click', toggleSidebar);
  
  // Sidebar overlay click (close sidebar on mobile)
  sidebarOverlay.addEventListener('click', closeSidebar);
  
  // New chat button
  newChatBtn.addEventListener('click', () => {
    startNewChat();
    closeSidebar();
  });
  
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
  fileInput.addEventListener('change', handleImageUpload);
  
  // Focus input
  msgInput.focus();
}

// Make removeFilePreview global
window.removeFilePreview = removeFilePreview;

// ============================================
// START APP
// ============================================
init();
