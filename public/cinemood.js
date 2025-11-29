// =========================================
// CINEMOOD - MAIN JAVASCRIPT
// =========================================

// Global State
const STATE = {
  currentUser: 'default_user',
  currentSection: 'mood',
  currentRecommendations: [],
  discoverData: null,
  profileData: null
};

// API Base URL
const API_BASE = window.location.origin;

// =========================================
// INITIALIZATION
// =========================================

document.addEventListener('DOMContentLoaded', () => {
  initializeNavigation();
  initializeMoodSection();
  initializeChatWidget();
  
  // Load discover and profile data
  loadDiscoverSection();
  loadProfileSection();
});

// =========================================
// NAVIGATION
// =========================================

function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionName = link.dataset.section;
      switchSection(sectionName);
      
      // Update active nav link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

function switchSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show target section
  const targetSection = document.getElementById(`${sectionName}Section`);
  if (targetSection) {
    targetSection.classList.add('active');
    STATE.currentSection = sectionName;
    
    // Refresh data if needed
    if (sectionName === 'discover' && !STATE.discoverData) {
      loadDiscoverSection();
    } else if (sectionName === 'profile') {
      loadProfileSection();
    }
  }
}

// =========================================
// MOOD INPUT SECTION
// =========================================

function initializeMoodSection() {
  const moodInput = document.getElementById('moodInput');
  const findBtn = document.getElementById('findBtn');
  const moodChips = document.querySelectorAll('.mood-chip');
  const newSearchBtn = document.getElementById('newSearchBtn');
  
  // Mood chip clicks
  moodChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const moodText = chip.dataset.mood;
      moodInput.value = moodText;
      moodInput.focus();
    });
  });
  
  // Find button
  findBtn.addEventListener('click', () => {
    const moodText = moodInput.value.trim();
    if (moodText) {
      searchByMood(moodText);
    }
  });
  
  // Enter key in textarea
  moodInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      findBtn.click();
    }
  });
  
  // New search button
  if (newSearchBtn) {
    newSearchBtn.addEventListener('click', () => {
      resetMoodSearch();
    });
  }
}

async function searchByMood(moodText) {
  const loader = document.getElementById('loader');
  const resultsContainer = document.getElementById('resultsContainer');
  const moodHero = document.querySelector('.mood-hero');
  
  // Show loader
  moodHero.style.display = 'none';
  loader.style.display = 'flex';
  resultsContainer.style.display = 'none';
  
  try {
    const response = await fetch(`${API_BASE}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: STATE.currentUser,
        mood_text: moodText
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.recommendations) {
      STATE.currentRecommendations = data.recommendations;
      displayRecommendations(data);
    } else {
      showError(data.error || 'Failed to get recommendations');
      resetMoodSearch();
    }
  } catch (error) {
    console.error('Search error:', error);
    showError('Connection error. Please try again.');
    resetMoodSearch();
  } finally {
    loader.style.display = 'none';
  }
}

function displayRecommendations(data) {
  const resultsContainer = document.getElementById('resultsContainer');
  const resultsTitle = document.getElementById('resultsTitle');
  const resultsGrid = document.getElementById('resultsGrid');
  
  // Update title
  resultsTitle.textContent = data.mood_summary || 'Your Recommendations';
  
  // Clear previous results
  resultsGrid.innerHTML = '';
  
  // Render cards
  data.recommendations.forEach(title => {
    const card = createTitleCard(title);
    resultsGrid.appendChild(card);
  });
  
  // Show results
  resultsContainer.style.display = 'block';
}

function createTitleCard(title) {
  const card = document.createElement('div');
  card.className = 'title-card';
  
  const posterUrl = title.poster_url || 'https://via.placeholder.com/250x375?text=No+Poster';
  const rating = title.rating ? title.rating.toFixed(1) : 'N/A';
  const year = title.year || 'N/A';
  const type = title.type === 'movie' ? 'Movie' : 'TV Series';
  
  card.innerHTML = `
    <img src="${posterUrl}" alt="${title.title}" class="title-card-poster" />
    <div class="title-card-content">
      <div class="title-card-header">
        <div class="title-card-title">${title.title}</div>
        <div class="title-card-rating">
          <span>⭐</span>
          <span>${rating}</span>
        </div>
      </div>
      <div class="title-card-meta">${type} · ${year}</div>
      <div class="title-card-overview">${title.overview || 'No description available.'}</div>
      ${title.why_it_fits ? `<div class="title-card-mood-fit">"${title.why_it_fits}"</div>` : ''}
    </div>
  `;
  
  card.addEventListener('click', () => {
    openTitleModal(title.tmdb_id, title.type);
  });
  
  return card;
}

function resetMoodSearch() {
  const moodHero = document.querySelector('.mood-hero');
  const resultsContainer = document.getElementById('resultsContainer');
  const moodInput = document.getElementById('moodInput');
  
  moodHero.style.display = 'flex';
  resultsContainer.style.display = 'none';
  moodInput.value = '';
  STATE.currentRecommendations = [];
}

// =========================================
// TITLE DETAILS MODAL
// =========================================

async function openTitleModal(tmdbId, type) {
  const modal = document.getElementById('titleModal');
  const modalBody = document.getElementById('titleModalBody');
  
  // Show modal with loader
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 3rem;">
      <div class="loader-spinner" style="margin: 0 auto;"></div>
      <p class="loader-text">Loading details...</p>
    </div>
  `;
  modal.classList.add('active');
  
  try {
    const response = await fetch(`${API_BASE}/api/title/${type}/${tmdbId}`);
    const title = await response.json();
    
    if (response.ok) {
      renderTitleModal(title);
    } else {
      modalBody.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">Failed to load title details.</p>`;
    }
  } catch (error) {
    console.error('Title modal error:', error);
    modalBody.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">Connection error.</p>`;
  }
}

function renderTitleModal(title) {
  const modalBody = document.getElementById('titleModalBody');
  
  const backdropUrl = title.backdrop_url || title.poster_url || '';
  const posterUrl = title.poster_url || 'https://via.placeholder.com/200x300?text=No+Poster';
  const rating = title.rating ? title.rating.toFixed(1) : 'N/A';
  const year = title.year || 'N/A';
  const runtime = title.runtime ? `${title.runtime} min` : (title.seasons ? `${title.seasons} seasons` : '');
  const genres = title.genres || [];
  
  let trailerHtml = '';
  if (title.trailer_key) {
    trailerHtml = `
      <iframe 
        class="title-modal-trailer"
        src="https://www.youtube.com/embed/${title.trailer_key}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
  }
  
  modalBody.innerHTML = `
    ${backdropUrl ? `<img src="${backdropUrl}" alt="${title.title}" class="title-modal-backdrop" />` : ''}
    
    <div class="title-modal-main">
      <img src="${posterUrl}" alt="${title.title}" class="title-modal-poster" />
      
      <div class="title-modal-info">
        <h1 class="title-modal-title">${title.title}</h1>
        
        <div class="title-modal-meta">
          <div class="title-modal-rating">
            <span>⭐</span>
            <span>${rating}</span>
          </div>
          <span>·</span>
          <span>${year}</span>
          ${runtime ? `<span>·</span><span>${runtime}</span>` : ''}
          <span>·</span>
          <span>${title.type === 'movie' ? 'Movie' : 'TV Series'}</span>
        </div>
        
        <div class="title-modal-genres">
          ${genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}
        </div>
        
        ${title.tagline ? `<p style="font-style: italic; color: var(--text-secondary); margin-bottom: 1rem;">"${title.tagline}"</p>` : ''}
      </div>
    </div>
    
    ${trailerHtml}
    
    ${title.ai_description ? `
      <div class="title-modal-section">
        <h3>Cinematic Experience</h3>
        <p>${title.ai_description}</p>
      </div>
    ` : ''}
    
    <div class="title-modal-section">
      <h3>Overview</h3>
      <p>${title.overview || 'No overview available.'}</p>
    </div>
    
    ${title.ai_viewer_fit ? `
      <div class="title-modal-section">
        <h3>Perfect For</h3>
        <p>${title.ai_viewer_fit}</p>
      </div>
    ` : ''}
    
    <div class="title-modal-actions">
      <button class="action-btn action-btn-primary" onclick="addToFavorites('${title.tmdb_id}', '${title.type}', '${escapeQuotes(title.title)}', '${title.poster_url || ''}')">
        ⭐ Add to Favorites
      </button>
      <button class="action-btn action-btn-secondary" onclick="markAsViewed('${title.tmdb_id}', '${title.type}', '${escapeQuotes(title.title)}', '${title.poster_url || ''}')">
        👁 Mark as Viewed
      </button>
    </div>
  `;
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Close modal
document.addEventListener('click', (e) => {
  const modal = document.getElementById('titleModal');
  const modalContent = modal.querySelector('.title-modal-content');
  
  if (e.target.classList.contains('title-modal-overlay') || 
      e.target.classList.contains('title-modal-close')) {
    modal.classList.remove('active');
  }
});

// =========================================
// DISCOVER SECTION
// =========================================

async function loadDiscoverSection() {
  const carouselsContainer = document.getElementById('discoverCarousels');
  
  if (!carouselsContainer) return;
  
  // Show loader
  carouselsContainer.innerHTML = `
    <div style="text-align: center; padding: 3rem;">
      <div class="loader-spinner" style="margin: 0 auto;"></div>
      <p class="loader-text">Loading discoveries...</p>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_BASE}/api/discover`);
    const data = await response.json();
    
    if (response.ok && data.sections) {
      STATE.discoverData = data;
      renderDiscoverSections(data.sections);
    } else {
      carouselsContainer.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">Failed to load discoveries.</p>`;
    }
  } catch (error) {
    console.error('Discover error:', error);
    carouselsContainer.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">Connection error.</p>`;
  }
}

function renderDiscoverSections(sections) {
  const carouselsContainer = document.getElementById('discoverCarousels');
  carouselsContainer.innerHTML = '';
  
  sections.forEach(section => {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'carousel-section';
    
    sectionEl.innerHTML = `
      <div class="carousel-header">
        <h2 class="carousel-title">${section.title}</h2>
        <p class="carousel-caption">${section.caption}</p>
      </div>
      <div class="carousel-scroll">
        ${section.items.map(item => createCarouselCard(item)).join('')}
      </div>
    `;
    
    carouselsContainer.appendChild(sectionEl);
  });
  
  // Add click events to carousel cards
  document.querySelectorAll('.carousel-card').forEach(card => {
    card.addEventListener('click', () => {
      const tmdbId = card.dataset.tmdbId;
      const type = card.dataset.type;
      openTitleModal(tmdbId, type);
    });
  });
}

function createCarouselCard(item) {
  const posterUrl = item.poster_url || 'https://via.placeholder.com/200x300?text=No+Poster';
  const year = item.year || 'N/A';
  
  return `
    <div class="carousel-card" data-tmdb-id="${item.tmdb_id}" data-type="${item.type}">
      <img src="${posterUrl}" alt="${item.title}" class="carousel-card-poster" />
      <div class="carousel-card-title">${item.title}</div>
      <div class="carousel-card-meta">${year}</div>
    </div>
  `;
}

// =========================================
// PROFILE SECTION
// =========================================

async function loadProfileSection() {
  const personalityEl = document.getElementById('profilePersonality');
  const statsEl = document.getElementById('profileStats');
  const moodHistoryEl = document.getElementById('moodHistoryList');
  const favoritesEl = document.getElementById('favoritesList');
  const viewedEl = document.getElementById('viewedList');
  
  if (!personalityEl) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/profile/${STATE.currentUser}`);
    const data = await response.json();
    
    if (response.ok) {
      STATE.profileData = data;
      renderProfileData(data);
    } else {
      personalityEl.innerHTML = `<p class="personality-text" style="color: var(--text-muted);">Failed to load profile.</p>`;
    }
  } catch (error) {
    console.error('Profile error:', error);
    personalityEl.innerHTML = `<p class="personality-text" style="color: var(--text-muted);">Connection error.</p>`;
  }
}

function renderProfileData(data) {
  // Cinema Personality
  const personalityEl = document.getElementById('profilePersonality');
  personalityEl.innerHTML = `
    <div class="personality-icon">🎭</div>
    <p class="personality-text">${data.cinema_personality}</p>
  `;
  
  // Stats
  const statsEl = document.getElementById('profileStats');
  statsEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${data.stats.total_moods}</div>
      <div class="stat-label">Mood Searches</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.stats.total_favorites}</div>
      <div class="stat-label">Favorites</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.stats.total_viewed}</div>
      <div class="stat-label">Viewed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.stats.top_genres.length > 0 ? data.stats.top_genres[0].genre : 'N/A'}</div>
      <div class="stat-label">Top Genre</div>
    </div>
  `;
  
  // Mood History
  const moodHistoryEl = document.getElementById('moodHistoryList');
  if (data.mood_history && data.mood_history.length > 0) {
    moodHistoryEl.innerHTML = data.mood_history.slice(0, 10).map(mood => `
      <div class="mood-history-item">
        <div class="mood-history-text">"${mood.mood_text}"</div>
        ${mood.mood_tags && mood.mood_tags.length > 0 ? `
          <div class="mood-history-tags">
            ${mood.mood_tags.map(tag => `<span class="mood-tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
        <div class="mood-history-date">${formatDate(mood.created_at)}</div>
      </div>
    `).join('');
  } else {
    moodHistoryEl.innerHTML = `<p style="color: var(--text-muted);">No mood history yet. Start exploring!</p>`;
  }
  
  // Favorites
  const favoritesEl = document.getElementById('favoritesList');
  if (data.favorites && data.favorites.length > 0) {
    favoritesEl.innerHTML = data.favorites.map(fav => `
      <div class="profile-title-card" onclick="openTitleModal('${fav.tmdb_id}', '${fav.type}')">
        <img src="${fav.poster_url || 'https://via.placeholder.com/150x225'}" alt="${fav.title}" class="profile-title-poster" />
        <div class="profile-title-name">${fav.title}</div>
      </div>
    `).join('');
  } else {
    favoritesEl.innerHTML = `<p style="color: var(--text-muted);">No favorites yet.</p>`;
  }
  
  // Viewed
  const viewedEl = document.getElementById('viewedList');
  if (data.viewed_titles && data.viewed_titles.length > 0) {
    viewedEl.innerHTML = data.viewed_titles.map(viewed => `
      <div class="profile-title-card" onclick="openTitleModal('${viewed.tmdb_id}', '${viewed.type}')">
        <img src="${viewed.poster_url || 'https://via.placeholder.com/150x225'}" alt="${viewed.title}" class="profile-title-poster" />
        <div class="profile-title-name">${viewed.title}</div>
      </div>
    `).join('');
  } else {
    viewedEl.innerHTML = `<p style="color: var(--text-muted);">No viewed titles yet.</p>`;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// =========================================
// FAVORITES & VIEWED
// =========================================

async function addToFavorites(tmdbId, type, title, posterUrl) {
  try {
    const response = await fetch(`${API_BASE}/api/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: STATE.currentUser,
        tmdb_id: tmdbId,
        type: type,
        title: title,
        poster_url: posterUrl,
        action: 'add'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification('✨ Added to favorites!', 'success');
      // Refresh profile if on profile page
      if (STATE.currentSection === 'profile') {
        loadProfileSection();
      }
    } else {
      showNotification('❌ Failed to add to favorites', 'error');
    }
  } catch (error) {
    console.error('Add favorite error:', error);
    showNotification('❌ Connection error', 'error');
  }
}

async function markAsViewed(tmdbId, type, title, posterUrl) {
  try {
    const response = await fetch(`${API_BASE}/api/viewed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: STATE.currentUser,
        tmdb_id: tmdbId,
        type: type,
        title: title,
        poster_url: posterUrl
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification('👁 Marked as viewed!', 'success');
      // Refresh profile if on profile page
      if (STATE.currentSection === 'profile') {
        loadProfileSection();
      }
    } else {
      showNotification('❌ Failed to mark as viewed', 'error');
    }
  } catch (error) {
    console.error('Mark viewed error:', error);
    showNotification('❌ Connection error', 'error');
  }
}

// =========================================
// CHAT WIDGET
// =========================================

function initializeChatWidget() {
  const chatToggle = document.getElementById('chatToggle');
  const chatPanel = document.getElementById('chatPanel');
  const chatClose = document.getElementById('chatClose');
  const chatSend = document.getElementById('chatSend');
  const chatInput = document.getElementById('chatInput');
  
  // Toggle panel
  chatToggle.addEventListener('click', () => {
    chatPanel.style.display = chatPanel.style.display === 'none' ? 'flex' : 'none';
  });
  
  // Close panel
  chatClose.addEventListener('click', () => {
    chatPanel.style.display = 'none';
  });
  
  // Send message
  chatSend.addEventListener('click', () => {
    sendChatMessage();
  });
  
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
}

async function sendChatMessage() {
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const message = chatInput.value.trim();
  
  if (!message) return;
  
  // Add user message
  addChatMessage('user', message);
  chatInput.value = '';
  
  // Add typing indicator
  const typingId = 'typing-' + Date.now();
  addChatMessage('assistant', '...', typingId);
  
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: STATE.currentUser,
        message: message
      })
    });
    
    const data = await response.json();
    
    // Remove typing indicator
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    
    if (response.ok && data.reply) {
      addChatMessage('assistant', data.reply);
    } else {
      addChatMessage('assistant', 'Sorry, I encountered an error.');
    }
  } catch (error) {
    console.error('Chat error:', error);
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    addChatMessage('assistant', 'Connection error. Please try again.');
  }
}

function addChatMessage(role, text, id = null) {
  const chatMessages = document.getElementById('chatMessages');
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${role}`;
  if (id) messageEl.id = id;
  messageEl.textContent = text;
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// =========================================
// UTILITIES
// =========================================

function showNotification(message, type = 'success') {
  // Simple notification (you can enhance this)
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 2rem;
    background: ${type === 'success' ? 'var(--success)' : 'var(--neon-primary)'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 3000;
    animation: slideUp 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    notification.style.transition = 'all 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showError(message) {
  showNotification(message, 'error');
}

// Make functions globally accessible
window.openTitleModal = openTitleModal;
window.addToFavorites = addToFavorites;
window.markAsViewed = markAsViewed;
