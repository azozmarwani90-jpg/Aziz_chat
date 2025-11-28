// ============================================
// DOM ELEMENTS
// ============================================
const chatDiv = document.getElementById("chat");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const attachBtn = document.getElementById("attachBtn");
const filePreviewDiv = document.getElementById("filePreview");

// ============================================
// STATE
// ============================================
let selectedFile = null;
let selectedFileDataUrl = null;

// ============================================
// FILE HANDLING
// ============================================

// Open file picker when attach button is clicked
attachBtn.addEventListener("click", () => {
  fileInput.click();
});

// Handle file selection
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type (images only)
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file (PNG, JPG, etc.)");
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("File size must be less than 5MB");
    return;
  }

  selectedFile = file;

  // Read file as data URL for preview
  const reader = new FileReader();
  reader.onload = (event) => {
    selectedFileDataUrl = event.target.result;
    showFilePreview(file, selectedFileDataUrl);
  };
  reader.readAsDataURL(file);
});

// Show file preview
function showFilePreview(file, dataUrl) {
  filePreviewDiv.innerHTML = `
    <img src="${dataUrl}" alt="Preview">
    <div class="file-info">
      <div class="file-name">${file.name}</div>
      <div>${formatFileSize(file.size)}</div>
    </div>
    <button class="remove-file" onclick="removeFile()">×</button>
  `;
  filePreviewDiv.style.display = "flex";
}

// Remove selected file
function removeFile() {
  selectedFile = null;
  selectedFileDataUrl = null;
  fileInput.value = "";
  filePreviewDiv.style.display = "none";
  filePreviewDiv.innerHTML = "";
}

// Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ============================================
// MESSAGE HANDLING
// ============================================

// Send message function
async function sendMessage() {
  const message = msgInput.value.trim();

  // Don't send if both message and file are empty
  if (!message && !selectedFile) return;

  // Clear input immediately
  msgInput.value = "";
  msgInput.style.height = "auto";

  // Display user's message
  if (message) {
    addMessage(message, "user", selectedFileDataUrl);
  } else if (selectedFile) {
    addMessage("Sent an image", "user", selectedFileDataUrl);
  }

  // Clear file preview
  const fileToSend = selectedFile;
  const fileDataUrl = selectedFileDataUrl;
  removeFile();

  // Disable send button
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  // Show typing indicator
  const typingId = showTypingIndicator();

  try {
    // Prepare the request body
    let requestBody = { message: message || "What's in this image?" };

    // If there's an image, include it as base64
    if (fileDataUrl) {
      requestBody.image = fileDataUrl;
    }

    // Send to backend
    const response = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Remove typing indicator
    removeTypingIndicator(typingId);

    if (response.ok) {
      addMessage(data.reply, "ai");
    } else {
      addMessage(`Error: ${data.error || "Something went wrong"}`, "ai");
    }
  } catch (error) {
    removeTypingIndicator(typingId);
    console.error("Fetch error:", error);
    addMessage("❌ Failed to connect to the server. Make sure it's running!", "ai");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
    msgInput.focus();
  }
}

// Add message to chat
function addMessage(text, type, imageUrl = null) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type === "user" ? "user-message" : "ai-message"}`;
  
  // Add text
  const textNode = document.createTextNode(text);
  messageDiv.appendChild(textNode);
  
  // Add image if present
  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.className = "message-image";
    img.alt = "Uploaded image";
    img.onclick = () => window.open(imageUrl, "_blank");
    messageDiv.appendChild(img);
  }
  
  chatDiv.appendChild(messageDiv);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "typing-indicator";
  typingDiv.id = "typing-" + Date.now();
  typingDiv.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  chatDiv.appendChild(typingDiv);
  chatDiv.scrollTop = chatDiv.scrollHeight;
  return typingDiv.id;
}

// Remove typing indicator
function removeTypingIndicator(id) {
  const typingDiv = document.getElementById(id);
  if (typingDiv) {
    typingDiv.remove();
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Send button click
sendBtn.addEventListener("click", sendMessage);

// Enter key to send (Shift+Enter for new line)
msgInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
msgInput.addEventListener("input", () => {
  msgInput.style.height = "auto";
  msgInput.style.height = msgInput.scrollHeight + "px";
});

// Focus on input when page loads
msgInput.focus();

// Make removeFile globally accessible
window.removeFile = removeFile;
