const socket = io();
let currentServer = 'general';
let currentChannel = 'general';
let username = '';
let userEmail = '';
let userStatus = 'online';
let userTheme = 'dark';
let typingTimeout;
let replyingTo = null;
let currentMessageIdForReaction = null;
let selectedAvatar = '😺';
let selectedServerIcon = '🏠';
let userBio = 'Hey there! I use Patecord.';
let inVoiceChannel = false;
let currentVoiceChannel = null;
let isMuted = false;
let isDeafened = false;
let voiceStream = null;
let peerConnections = {};
let authToken = '';

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const TENOR_CLIENT_KEY = 'patecord';

const emojiCategories = {
  smileys: ['😀', '😃', '😄', '😁', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳'],
  gestures: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝'],
  food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧈', '🧇', '🥓', '🥚', '🍳', '🧆', '🌮', '🌯', '🥙', '🧆', '🥗', '🍝', '🍜', '🍲', '🍱', '🍘', '🍙', '🍚', '🍛', '🍣', '🍤', '🍥'],
  activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹'],
  symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎']
};

document.addEventListener('DOMContentLoaded', () => {
  checkLoginStatus();
  setupLoginListeners();
});

// ==================== API HELPERS ====================

async function apiCall(endpoint, options = {}) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(endpoint, {
      ...options,
      headers
    });
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    return { success: false, error: 'Network error' };
  }
}

// ==================== LOGIN SYSTEM ====================

async function checkLoginStatus() {
  const token = localStorage.getItem('authToken');
  if (token) {
    const result = await apiCall('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (result.success) {
      authToken = token;
      username = result.user.username;
      userEmail = result.user.email;
      selectedAvatar = result.user.avatar;
      userBio = result.user.bio;
      userStatus = result.user.status || 'online';
      showMainApp();
      return;
    }
  }
  
  document.getElementById('loginScreen').style.display = 'flex';
}

function setupLoginListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
      e.target.classList.add('active');
      const tab = e.target.dataset.tab;
      document.getElementById(tab + 'Form').classList.add('active');
    };
  });

  // Avatar selection in register
  document.querySelectorAll('.avatar-option-login').forEach(opt => {
    opt.onclick = (e) => {
      document.querySelectorAll('.avatar-option-login').forEach(o => o.classList.remove('selected'));
      e.target.classList.add('selected');
      selectedAvatar = e.target.dataset.avatar;
    };
  });

  // Login button
  document.getElementById('loginBtn').onclick = handleLogin;
  document.getElementById('loginUsername').onkeypress = (e) => {
    if (e.key === 'Enter') handleLogin();
  };
  document.getElementById('loginPassword').onkeypress = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  // Register button
  document.getElementById('registerBtn').onclick = handleRegister;
}

async function handleLogin() {
  const emailOrUsername = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  
  if (!emailOrUsername || !password) {
    alert('Please fill in all fields');
    return;
  }

  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrUsername, password })
  });

  if (result.success) {
    authToken = result.token;
    username = result.user.username;
    userEmail = result.user.email;
    selectedAvatar = result.user.avatar;
    userBio = result.user.bio;
    userStatus = result.user.status || 'online';
    
    localStorage.setItem('authToken', authToken);
    showMainApp();
  } else {
    alert(result.error || 'Login failed');
  }
}

async function handleRegister() {
  const email = document.getElementById('registerEmail').value.trim();
  const user = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value.trim();

  if (!email || !user || !password) {
    alert('Please fill in all required fields');
    return;
  }

  const result = await apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ 
      email, 
      username: user, 
      password, 
      avatar: selectedAvatar 
    })
  });

  if (result.success) {
    authToken = result.token;
    username = result.user.username;
    userEmail = result.user.email;
    selectedAvatar = result.user.avatar;
    userBio = result.user.bio;
    
    localStorage.setItem('authToken', authToken);
    showMainApp();
  } else {
    alert(result.error || 'Registration failed');
  }
}

function handleLogout() {
  openModal('logoutModal');
}

function confirmLogout() {
  // Emit disconnect to server
  if (socket && socket.connected) {
    socket.disconnect();
  }
  
  // Clear auth data
  localStorage.removeItem('authToken');
  localStorage.removeItem('userProfile');
  authToken = '';
  username = '';
  userEmail = '';
  
  // Close modal
  closeModal('logoutModal');
  
  // Show logout animation
  const mainApp = document.getElementById('mainApp');
  mainApp.style.animation = 'fadeOut 0.3s ease';
  
  setTimeout(() => {
    // Hide main app
    mainApp.style.display = 'none';
    mainApp.style.animation = '';
    
    // Show login screen
    const loginScreen = document.getElementById('loginScreen');
    loginScreen.style.display = 'flex';
    loginScreen.style.animation = 'fadeIn 0.3s ease';
    
    // Reset form fields
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
    
    // Switch to login tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));
    document.querySelector('[data-tab="login"]').classList.add('active');
    document.getElementById('loginForm').classList.add('active');
  }, 300);
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userProfile');
  authToken = '';
  username = '';
  location.reload();
}

function showMainApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  
  initializeUser();
  setupEventListeners();
  setupSocketListeners();
}

// ==================== INITIALIZATION ====================

function initializeUser() {
  document.getElementById('myUsername').textContent = username;
  document.getElementById('myStatus').textContent = '#' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  document.getElementById('myAvatar').querySelector('.avatar-img').textContent = selectedAvatar;
  
  socket.emit('join', { 
    username, 
    serverId: currentServer, 
    channel: currentChannel,
    avatar: selectedAvatar,
    status: userStatus,
    bio: userBio
  });
  
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
}

function setupEventListeners() {
  // Server clicks
  document.querySelectorAll('.server-icon').forEach(s => {
    if (!s.classList.contains('add-server')) {
      s.onclick = (e) => {
        const serverEl = e.currentTarget;
        if (serverEl.classList.contains('home-icon')) {
          currentServer = 'home';
        } else {
          currentServer = serverEl.dataset.server;
        }
        switchServer();
      };
    } else {
      s.onclick = () => openModal('createServerModal');
    }
  });

  // Channel clicks
  document.querySelectorAll('.channel').forEach(c => {
    c.onclick = (e) => {
      currentChannel = e.currentTarget.dataset.channel;
      switchChannel();
    };
  });

  // Voice channel clicks
  document.querySelectorAll('.voice-channel').forEach(vc => {
    vc.onclick = (e) => {
      const channel = e.currentTarget.dataset.channel;
      joinVoiceChannel(channel);
    };
  });

  // Message input
  const input = document.getElementById('messageInput');
  input.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'Escape') {
      cancelReply();
    } else {
      clearTimeout(typingTimeout);
      socket.emit('typing', { username, serverId: currentServer, channel: currentChannel });
      typingTimeout = setTimeout(() => {
        socket.emit('stopTyping', { username, serverId: currentServer, channel: currentChannel });
      }, 2000);
    }
  };

  document.getElementById('sendBtn').onclick = sendMessage;
  document.getElementById('statusBtn').onclick = () => openModal('statusModal');
  document.getElementById('themeBtn').onclick = toggleTheme;
  document.getElementById('editProfileBtn').onclick = openEditProfile;
  document.getElementById('logoutBtn').onclick = handleLogout;
  document.getElementById('gifBtnInput').onclick = () => openGifPicker();
  document.getElementById('emojiBtn').onclick = () => insertEmojiIntoMessage();
  document.getElementById('viewAllUsersBtn').onclick = openAllUsersModal;
  
  document.getElementById('toggleUsersBtn').onclick = () => {
    document.getElementById('userPanel').classList.toggle('active');
  };

  // Voice controls
  document.getElementById('voiceBtn').onclick = showVoiceChannels;
  document.getElementById('leaveVoiceBtn').onclick = leaveVoiceChannel;
  document.getElementById('muteMicBtn').onclick = toggleMute;
  document.getElementById('deafenBtn').onclick = toggleDeafen;
  document.getElementById('shareScreenBtn').onclick = shareScreen;

  // Status options
  document.querySelectorAll('.status-option').forEach(option => {
    option.onclick = (e) => {
      const status = e.currentTarget.dataset.status;
      setUserStatus(status);
      closeModal('statusModal');
    };
  });

  // Search messages
  document.getElementById('searchMessages').oninput = (e) => {
    searchMessages(e.target.value);
  };

  // Avatar selector
  document.querySelectorAll('.avatar-option').forEach(option => {
    option.onclick = (e) => {
      document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
      e.target.classList.add('selected');
      selectedAvatar = e.target.textContent;
    };
  });

  // Icon selector
  document.querySelectorAll('.icon-option').forEach(option => {
    option.onclick = (e) => {
      document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
      e.target.classList.add('selected');
      selectedServerIcon = e.target.dataset.icon;
    };
  });

  // Reaction categories
  document.querySelectorAll('.reaction-category').forEach(cat => {
    cat.onclick = (e) => {
      document.querySelectorAll('.reaction-category').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      const category = e.target.dataset.category;
      loadReactionEmojis(category);
    };
  });

  // GIF categories
  document.querySelectorAll('.gif-category-btn').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('.gif-category-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const query = e.target.dataset.query;
      searchGifs(query);
    };
  });

  // GIF search
  document.getElementById('gifSearch').oninput = debounce((e) => {
    searchGifs(e.target.value || 'trending');
  }, 500);
  
  // Users search
  document.getElementById('usersSearch').oninput = (e) => {
    filterUsers(e.target.value);
  };
}

// ==================== SOCKET LISTENERS ====================

function setupSocketListeners() {
  socket.on('message', (data) => {
    displayMessage(data);
  });

  socket.on('userList', (data) => {
    updateUsers(data);
  });

  socket.on('userJoined', (data) => {
    showSystemMessage(`${data.username} joined the channel`);
  });

  socket.on('userLeft', (data) => {
    showSystemMessage(`${data.username} left the channel`);
  });

  socket.on('typing', (data) => {
    showTyping(data.username);
  });

  socket.on('stopTyping', () => {
    clearTyping();
  });

  socket.on('reactionAdded', (data) => {
    addReactionToMessage(data.messageId, data.emoji, data.username);
  });

  socket.on('profileUpdated', (data) => {
    updateUserInList(data.username, data.avatar, data.bio);
  });

  socket.on('statusChanged', (data) => {
    updateUserStatus(data.username, data.status);
  });

  socket.on('usernameChanged', (data) => {
    updateUsernameInUI(data.oldUsername, data.newUsername);
  });

  socket.on('serverCreated', (data) => {
    addServerToUI(data);
  });

  socket.on('voiceUserJoined', (data) => {
    addVoiceParticipant(data.username, data.avatar);
  });

  socket.on('voiceUserLeft', (data) => {
    removeVoiceParticipant(data.username);
  });
}

// ==================== USER PROFILE VIEWING ====================

async function viewUserProfile(targetUsername) {
  const result = await apiCall(`/api/user/${targetUsername}`);
  
  if (result.success) {
    const user = result.user;
    
    document.getElementById('profileAvatarLarge').textContent = user.avatar;
    document.getElementById('profileUsername').textContent = user.username;
    document.getElementById('profileBio').textContent = user.bio || 'No bio set';
    document.getElementById('profileStatus').textContent = user.status.charAt(0).toUpperCase() + user.status.slice(1);
    
    const statusIndicator = document.getElementById('profileStatusIndicator');
    statusIndicator.className = `status-indicator ${user.status}`;
    
    if (user.createdAt) {
      const date = new Date(user.createdAt);
      document.getElementById('profileJoinDate').textContent = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else {
      document.getElementById('profileJoinDate').textContent = 'Recently joined';
    }
    
    openModal('userProfileModal');
  } else {
    alert('Failed to load user profile');
  }
}

async function openAllUsersModal() {
  openModal('allUsersModal');
  
  const result = await apiCall('/api/users');
  
  if (result.success) {
    displayAllUsers(result.users);
  } else {
    document.getElementById('allUsersList').innerHTML = '<div class="error-message">Failed to load users</div>';
  }
}

function displayAllUsers(users) {
  const container = document.getElementById('allUsersList');
  
  if (users.length === 0) {
    container.innerHTML = '<div class="no-users">No users found</div>';
    return;
  }
  
  container.innerHTML = users.map(user => `
    <div class="user-list-item" onclick="viewUserProfile('${escapeHtml(user.username)}')">
      <div class="user-list-avatar">
        <div class="avatar-img">${user.avatar}</div>
        <div class="status-indicator ${user.status || 'online'}"></div>
      </div>
      <div class="user-list-info">
        <div class="user-list-name">${escapeHtml(user.username)}</div>
        <div class="user-list-bio">${escapeHtml(user.bio || 'No bio')}</div>
      </div>
    </div>
  `).join('');
}

function filterUsers(query) {
  const items = document.querySelectorAll('.user-list-item');
  const lowerQuery = query.toLowerCase();
  
  items.forEach(item => {
    const username = item.querySelector('.user-list-name').textContent.toLowerCase();
    const bio = item.querySelector('.user-list-bio').textContent.toLowerCase();
    item.style.display = (username.includes(lowerQuery) || bio.includes(lowerQuery)) ? '' : 'none';
  });
}

// ==================== MESSAGING ====================

function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  
  if (!text) return;

  socket.emit('message', {
    username,
    text,
    serverId: currentServer,
    channel: currentChannel,
    avatar: selectedAvatar,
    replyTo: replyingTo
  });

  input.value = '';
  cancelReply();
  socket.emit('stopTyping', { username, serverId: currentServer, channel: currentChannel });
}

function displayMessage(data) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message';
  div.dataset.messageId = data.id;

  let replyHtml = '';
  if (data.replyTo) {
    replyHtml = `
      <div class="message-reply">
        <span class="reply-icon">↩️</span>
        <span class="reply-to">Replying to <strong>${escapeHtml(data.replyTo.username)}</strong>: ${escapeHtml(data.replyTo.text.substring(0, 50))}</span>
      </div>
    `;
  }

  // Check if message contains GIF URL
  const gifRegex = /(https:\/\/media\.tenor\.com\/[^\s]+)/g;
  let messageContent = escapeHtml(data.text);
  
  if (gifRegex.test(data.text)) {
    messageContent = data.text.replace(gifRegex, '<img src="$1" class="message-gif" alt="GIF">');
  }

  div.innerHTML = `
    <div class="message-avatar" onclick="viewUserProfile('${escapeHtml(data.username)}')" style="cursor: pointer;">
      <div class="avatar-img">${data.avatar}</div>
    </div>
    <div class="message-content">
      ${replyHtml}
      <div class="message-header">
        <span class="message-username" onclick="viewUserProfile('${escapeHtml(data.username)}')" style="cursor: pointer;">${escapeHtml(data.username)}</span>
        <span class="message-timestamp">${formatTime(data.timestamp)}</span>
      </div>
      <div class="message-text">${messageContent}</div>
      <div class="message-reactions" id="reactions-${data.id}"></div>
      <div class="message-actions">
        <button class="message-action-btn" onclick="replyToMessage('${data.id}', '${escapeHtml(data.username)}', '${escapeHtml(data.text)}')">💬</button>
        <button class="message-action-btn" onclick="openReactionPicker('${data.id}')">😊</button>
      </div>
    </div>
  `;

  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;

  // Remove welcome message if it exists
  const welcome = msgs.querySelector('.welcome-message');
  if (welcome) welcome.remove();
}

function replyToMessage(messageId, replyUsername, replyText) {
  replyingTo = { messageId, username: replyUsername, text: replyText };
  
  document.getElementById('replyIndicator').style.display = 'flex';
  document.getElementById('replyUsername').textContent = replyUsername;
  document.getElementById('replyPreview').textContent = replyText.substring(0, 100);
  document.getElementById('messageInput').focus();
}

function cancelReply() {
  replyingTo = null;
  document.getElementById('replyIndicator').style.display = 'none';
}

// ==================== REACTIONS ====================

function openReactionPicker(messageId) {
  currentMessageIdForReaction = messageId;
  loadReactionEmojis('smileys');
  openModal('reactionPickerModal');
}

function loadReactionEmojis(category) {
  const grid = document.getElementById('reactionGrid');
  const emojis = emojiCategories[category] || [];
  
  grid.innerHTML = emojis.map(emoji => 
    `<div class="reaction-emoji" onclick="addReaction('${emoji}')">${emoji}</div>`
  ).join('');
}

function addReaction(emoji) {
  if (!currentMessageIdForReaction) return;
  
  socket.emit('addReaction', {
    messageId: currentMessageIdForReaction,
    emoji,
    username,
    serverId: currentServer,
    channel: currentChannel
  });
  
  closeModal('reactionPickerModal');
  currentMessageIdForReaction = null;
}

function addReactionToMessage(messageId, emoji, reactUsername) {
  const reactionsDiv = document.getElementById(`reactions-${messageId}`);
  if (!reactionsDiv) return;

  let emojiSpan = Array.from(reactionsDiv.children).find(span => 
    span.textContent.includes(emoji)
  );

  if (emojiSpan) {
    const count = parseInt(emojiSpan.dataset.count || '1') + 1;
    emojiSpan.dataset.count = count;
    emojiSpan.textContent = `${emoji} ${count}`;
  } else {
    emojiSpan = document.createElement('span');
    emojiSpan.className = 'reaction';
    emojiSpan.dataset.count = '1';
    emojiSpan.textContent = `${emoji} 1`;
    reactionsDiv.appendChild(emojiSpan);
  }
}

function insertEmojiIntoMessage() {
  const randomEmojis = ['😀', '😊', '❤️', '👍', '🎉', '🔥', '✨', '💯'];
  const emoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
  const input = document.getElementById('messageInput');
  input.value += emoji;
  input.focus();
}

// ==================== GIF PICKER ====================

function openGifPicker() {
  openModal('gifPickerModal');
  searchGifs('trending');
}

async function searchGifs(query) {
  const grid = document.getElementById('gifGrid');
  grid.innerHTML = '<div class="gif-loading">Loading GIFs...</div>';

  try {
    const endpoint = query === 'trending' 
      ? `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`
      : `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`;

    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      grid.innerHTML = data.results.map(gif => {
        const gifUrl = gif.media_formats.gif.url;
        return `<div class="gif-item" onclick="sendGif('${gifUrl}')">
          <img src="${gifUrl}" alt="GIF">
        </div>`;
      }).join('');
    } else {
      grid.innerHTML = '<div class="no-gifs">No GIFs found</div>';
    }
  } catch (error) {
    grid.innerHTML = '<div class="error-message">Failed to load GIFs</div>';
    console.error('GIF search error:', error);
  }
}

function sendGif(gifUrl) {
  socket.emit('message', {
    username,
    text: gifUrl,
    serverId: currentServer,
    channel: currentChannel,
    avatar: selectedAvatar,
    replyTo: replyingTo
  });

  closeModal('gifPickerModal');
  cancelReply();
}

// ==================== VOICE CHANNELS ====================

function showVoiceChannels() {
  alert('Voice channels feature - Select a voice channel from the sidebar!');
}

function joinVoiceChannel(channel) {
  document.getElementById('joiningVoiceChannel').textContent = channel;
  openModal('voiceJoinModal');
  currentVoiceChannel = channel;
}

function confirmJoinVoice() {
  if (!currentVoiceChannel) return;
  
  inVoiceChannel = true;
  document.getElementById('voiceChannelName').textContent = currentVoiceChannel;
  document.getElementById('voicePanel').classList.add('active');
  
  socket.emit('joinVoice', { 
    username, 
    channel: currentVoiceChannel,
    avatar: selectedAvatar
  });
  
  closeModal('voiceJoinModal');
}

function leaveVoiceChannel() {
  if (!currentVoiceChannel) return;
  
  socket.emit('leaveVoice', { 
    username, 
    channel: currentVoiceChannel 
  });
  
  inVoiceChannel = false;
  document.getElementById('voicePanel').classList.remove('active');
  currentVoiceChannel = null;
}

function toggleMute() {
  isMuted = !isMuted;
  const btn = document.getElementById('muteMicBtn');
  btn.classList.toggle('muted', isMuted);
  btn.querySelector('span').textContent = isMuted ? '🎤🚫' : '🎤';
}

function toggleDeafen() {
  isDeafened = !isDeafened;
  const btn = document.getElementById('deafenBtn');
  btn.classList.toggle('deafened', isDeafened);
  btn.querySelector('span').textContent = isDeafened ? '🔇' : '🔊';
}

function shareScreen() {
  alert('Screen sharing feature coming soon!');
}

function addVoiceParticipant(username, avatar) {
  const container = document.getElementById('voiceParticipants');
  const div = document.createElement('div');
  div.className = 'voice-participant';
  div.dataset.username = username;
  div.innerHTML = `
    <div class="participant-avatar">${avatar}</div>
    <div class="participant-info">
      <div class="participant-name">${escapeHtml(username)}</div>
      <div class="participant-status">🎤 Speaking</div>
    </div>
  `;
  container.appendChild(div);
}

function removeVoiceParticipant(username) {
  const participant = document.querySelector(`[data-username="${username}"]`);
  if (participant) {
    participant.remove();
  }
}

function updateVoiceUsers(users) {
  const container = document.getElementById('voiceParticipants');
  container.innerHTML = users.map(user => `
    <div class="voice-participant" data-username="${user.username}">
      <div class="participant-avatar">${user.avatar}</div>
      <div class="participant-info">
        <div class="participant-name">${escapeHtml(user.username)}</div>
        <div class="participant-status">🎤 Speaking</div>
      </div>
    </div>
  `).join('');
}

// ==================== PROFILE & SERVERS ====================

function openEditProfile() {
  document.getElementById('editUsername').value = username;
  document.getElementById('editBio').value = userBio;
  
  document.querySelectorAll('.avatar-option').forEach(option => {
    if (option.textContent === selectedAvatar) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
  
  openModal('editProfileModal');
}

async function saveProfile() {
  const newUsername = document.getElementById('editUsername').value.trim();
  const newBio = document.getElementById('editBio').value.trim();
  
  const result = await apiCall('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify({
      username: newUsername || username,
      avatar: selectedAvatar,
      bio: newBio
    })
  });

  if (result.success) {
    const oldUsername = username;
    
    if (result.newToken) {
      authToken = result.newToken;
      localStorage.setItem('authToken', authToken);
    }
    
    username = result.user.username;
    userBio = result.user.bio;
    selectedAvatar = result.user.avatar;
    
    document.getElementById('myUsername').textContent = username;
    document.getElementById('myAvatar').querySelector('.avatar-img').textContent = selectedAvatar;
    
    if (oldUsername !== username) {
      socket.emit('usernameChange', { oldUsername, newUsername: username });
    }
    
    socket.emit('profileUpdate', { username, avatar: selectedAvatar, bio: userBio });
    closeModal('editProfileModal');
  } else {
    alert(result.error || 'Failed to update profile');
  }
}

function createServer() {
  const serverName = document.getElementById('newServerName').value.trim();
  
  if (!serverName) {
    alert('Please enter a server name!');
    return;
  }
  
  const serverId = serverName.toLowerCase().replace(/\s+/g, '-');
  const serverData = {
    id: serverId,
    name: serverName,
    icon: selectedServerIcon,
    channels: ['general', 'random'],
    creator: username
  };
  
  socket.emit('createServer', serverData);
  document.getElementById('newServerName').value = '';
  closeModal('createServerModal');
}

function addServerToUI(serverData) {
  const serversContainer = document.querySelector('.servers');
  const addBtn = serversContainer.querySelector('.add-server');
  
  const serverDiv = document.createElement('div');
  serverDiv.className = 'server-icon';
  serverDiv.dataset.server = serverData.id;
  serverDiv.title = serverData.name;
  serverDiv.innerHTML = `<span>${serverData.icon}</span>`;
  
  serverDiv.onclick = () => {
    currentServer = serverData.id;
    switchServer();
  };
  
  serversContainer.insertBefore(serverDiv, addBtn);
  showSystemMessage(`Server "${serverData.name}" created!`);
}

function switchServer() {
  document.querySelectorAll('.server-icon').forEach(s => s.classList.remove('active'));
  document.querySelector(`[data-server="${currentServer}"]`)?.classList.add('active');
  
  const serverNames = {
    general: 'General Server',
    dev: 'Development',
    gaming: 'Gaming Hub',
    home: 'Home'
  };
  document.getElementById('serverName').textContent = serverNames[currentServer] || 'Server';
  
  switchChannel();
}

function switchChannel() {
  document.querySelectorAll('.channel').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-channel="${currentChannel}"]`)?.classList.add('active');
  
  document.getElementById('currentChannel').textContent = `# ${currentChannel}`;
  document.getElementById('messages').innerHTML = `
    <div class="welcome-message">
      <h1>Welcome to #${currentChannel}</h1>
      <p>This is the beginning of the #${currentChannel} channel.</p>
    </div>
  `;
  
  socket.emit('join', { 
    username, 
    serverId: currentServer, 
    channel: currentChannel,
    avatar: selectedAvatar,
    status: userStatus,
    bio: userBio
  });
}

// ==================== UTILITY FUNCTIONS ====================

function updateUsers(data) {
  const onlineUsers = data.users || [];
  document.getElementById('memberCount').textContent = onlineUsers.length;
  document.getElementById('onlineCount').textContent = onlineUsers.length;
  
  const onlineContainer = document.getElementById('onlineUsers');
  onlineContainer.innerHTML = onlineUsers.map(user => `
    <div class="member" onclick="viewUserProfile('${escapeHtml(user.username)}')" style="cursor: pointer;">
      <div class="member-avatar">
        <div class="avatar-img">${user.avatar || '😺'}</div>
        <div class="status-indicator ${user.status || 'online'}"></div>
      </div>
      <span class="member-name">${escapeHtml(user.username)}</span>
    </div>
  `).join('');
}

function updateUserInList(username, avatar, bio) {
  const memberElements = document.querySelectorAll('.member-name');
  memberElements.forEach(el => {
    if (el.textContent === username) {
      const avatarEl = el.closest('.member').querySelector('.avatar-img');
      if (avatarEl) avatarEl.textContent = avatar;
    }
  });
}

function updateUserStatus(username, status) {
  const memberElements = document.querySelectorAll('.member-name');
  memberElements.forEach(el => {
    if (el.textContent === username) {
      const statusEl = el.closest('.member').querySelector('.status-indicator');
      if (statusEl) {
        statusEl.className = `status-indicator ${status}`;
      }
    }
  });
}

function updateUsernameInUI(oldUsername, newUsername) {
  const memberElements = document.querySelectorAll('.member-name');
  memberElements.forEach(el => {
    if (el.textContent === oldUsername) {
      el.textContent = newUsername;
    }
  });
  
  const messageUsernames = document.querySelectorAll('.message-username');
  messageUsernames.forEach(el => {
    if (el.textContent === oldUsername) {
      el.textContent = newUsername;
    }
  });
}

function showTyping(username) {
  document.getElementById('typingIndicator').textContent = `${escapeHtml(username)} is typing...`;
}

function clearTyping() {
  document.getElementById('typingIndicator').textContent = '';
}

function showSystemMessage(text) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.style.cssText = 'text-align: center; padding: 8px; color: var(--text-muted); font-size: 13px; font-style: italic;';
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function setUserStatus(status) {
  userStatus = status;
  const statusIndicator = document.querySelector('.user-area .status-indicator');
  statusIndicator.className = `status-indicator ${status}`;
  
  const statusEmojis = { online: '🟢', away: '🟡', busy: '🔴', offline: '⚫' };
  document.getElementById('statusBtn').textContent = statusEmojis[status];
  
  socket.emit('statusChange', { username, status });
  
  // Update on backend
  apiCall('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
}

function toggleTheme() {
  const newTheme = userTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function setTheme(theme) {
  userTheme = theme;
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function searchMessages(query) {
  if (!query) {
    document.querySelectorAll('.message').forEach(msg => msg.style.display = '');
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  document.querySelectorAll('.message').forEach(msg => {
    const text = msg.querySelector('.message-text')?.textContent.toLowerCase() || '';
    const username = msg.querySelector('.message-username')?.textContent.toLowerCase() || '';
    msg.style.display = (text.includes(lowerQuery) || username.includes(lowerQuery)) ? '' : 'none';
  });
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
