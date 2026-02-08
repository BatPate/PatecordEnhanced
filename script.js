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

// ==================== LOGIN SYSTEM ====================

function checkLoginStatus() {
  const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  if (savedProfile.username) {
    username = savedProfile.username;
    userEmail = savedProfile.email || '';
    selectedAvatar = savedProfile.avatar || '😺';
    userBio = savedProfile.bio || 'Hey there! I use Patecord.';
    showMainApp();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
  }
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

function handleLogin() {
  const usernameInput = document.getElementById('loginUsername').value.trim();
  if (!usernameInput) {
    alert('Please enter a username');
    return;
  }

  username = usernameInput;
  
  const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  selectedAvatar = savedProfile.avatar || '😺';
  userBio = savedProfile.bio || 'Hey there! I use Patecord.';
  userEmail = savedProfile.email || '';

  localStorage.setItem('userProfile', JSON.stringify({
    username,
    email: userEmail,
    avatar: selectedAvatar,
    bio: userBio
  }));

  showMainApp();
}

function handleRegister() {
  const email = document.getElementById('registerEmail').value.trim();
  const user = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value.trim();

  if (!email || !user) {
    alert('Please fill in all required fields');
    return;
  }

  username = user;
  userEmail = email;

  localStorage.setItem('userProfile', JSON.stringify({
    username,
    email,
    avatar: selectedAvatar,
    bio: userBio
  }));

  showMainApp();
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
  document.getElementById('gifBtnInput').onclick = () => openGifPicker();
  document.getElementById('emojiBtn').onclick = () => insertEmojiIntoMessage();
  
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
      e.currentTarget.classList.add('selected');
      selectedAvatar = e.currentTarget.textContent;
    };
  });

  // Icon selector
  document.querySelectorAll('.icon-option').forEach(option => {
    option.onclick = (e) => {
      document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
      e.currentTarget.classList.add('selected');
      selectedServerIcon = e.currentTarget.dataset.icon;
    };
  });

  // Reaction categories
  document.querySelectorAll('.reaction-category').forEach(cat => {
    cat.onclick = (e) => {
      document.querySelectorAll('.reaction-category').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      loadReactionCategory(e.currentTarget.dataset.category);
    };
  });

  // GIF search
  document.getElementById('gifSearch').oninput = debounce((e) => {
    searchGifs(e.target.value);
  }, 500);

  // GIF categories
  document.querySelectorAll('.gif-category-btn').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('.gif-category-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      searchGifs(e.currentTarget.dataset.query);
    };
  });

  // Close modals on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    };
  });

  // Load initial emojis
  loadReactionCategory('smileys');
}

function setupSocketListeners() {
  socket.on('newMessage', (msg) => {
    appendMessage(msg);
  });

  socket.on('initMessages', (msgs) => {
    msgs.forEach(appendMessage);
  });

  socket.on('onlineUsers', updateUsers);
  
  socket.on('userTyping', (data) => {
    if (data.username !== username && data.channel === currentChannel) {
      showTyping(data.username);
    }
  });

  socket.on('userStopTyping', clearTyping);

  socket.on('userJoined', (data) => {
    showSystemMessage(`${data.username} joined the channel`);
  });

  socket.on('userLeft', (data) => {
    showSystemMessage(`${data.username} left the channel`);
  });

  socket.on('reactionAdded', (data) => {
    updateReactions(data.messageId, data.reactions);
  });

  socket.on('serverCreated', (serverData) => {
    addServerToUI(serverData);
  });

  // Voice chat events
  socket.on('voiceUserJoined', (data) => {
    addVoiceParticipant(data);
  });

  socket.on('voiceUserLeft', (data) => {
    removeVoiceParticipant(data.username);
  });

  socket.on('voiceUsersUpdate', (data) => {
    updateVoiceUsers(data.users);
  });
}

// ==================== MESSAGING ====================

function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text) return;

  const message = {
    id: Date.now() + '_' + Math.random(),
    username,
    serverId: currentServer,
    channel: currentChannel,
    text,
    timestamp: new Date().toISOString(),
    avatar: selectedAvatar,
    reactions: {},
    replyTo: replyingTo
  };

  socket.emit('message', message);
  input.value = '';
  cancelReply();
}

function sendGif(gifUrl) {
  const message = {
    id: Date.now() + '_' + Math.random(),
    username,
    serverId: currentServer,
    channel: currentChannel,
    text: '',
    gifUrl: gifUrl,
    timestamp: new Date().toISOString(),
    avatar: selectedAvatar,
    reactions: {},
    replyTo: replyingTo
  };

  socket.emit('message', message);
  closeModal('gifPickerModal');
  cancelReply();
}

function appendMessage(msg) {
  if (msg.channel !== currentChannel) return;

  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message';
  div.dataset.messageId = msg.id;
  
  let replyHTML = '';
  if (msg.replyTo) {
    replyHTML = `
      <div class="message-reply">
        <span class="message-reply-username">${escapeHtml(msg.replyTo.username)}</span>
        <span class="message-reply-text">${escapeHtml(msg.replyTo.text || 'GIF')}</span>
      </div>
    `;
  }

  let contentHTML = '';
  if (msg.gifUrl) {
    contentHTML = `<div class="message-gif"><img src="${msg.gifUrl}" alt="GIF"></div>`;
  } else {
    contentHTML = `<div class="message-text">${escapeHtml(msg.text)}</div>`;
  }

  let reactionsHTML = '';
  if (msg.reactions && Object.keys(msg.reactions).length > 0) {
    reactionsHTML = '<div class="message-reactions">';
    for (const [emoji, users] of Object.entries(msg.reactions)) {
      const isActive = users.includes(username);
      reactionsHTML += `
        <div class="reaction ${isActive ? 'active' : ''}" onclick="toggleReaction('${msg.id}', '${emoji}')">
          <span class="reaction-emoji">${emoji}</span>
          <span class="reaction-count">${users.length}</span>
        </div>
      `;
    }
    reactionsHTML += '</div>';
  }

  div.innerHTML = `
    <div class="message-content">
      <div class="message-avatar">${escapeHtml(msg.avatar)}</div>
      <div class="message-body">
        <div class="message-header">
          <span class="message-username">${escapeHtml(msg.username)}</span>
          <span class="message-timestamp">${formatTime(msg.timestamp)}</span>
        </div>
        ${replyHTML}
        ${contentHTML}
        ${reactionsHTML}
      </div>
    </div>
    <div class="message-actions">
      <button class="action-btn" onclick="openReactionPicker('${msg.id}')" title="Add Reaction">😊</button>
      <button class="action-btn" onclick="replyToMessage('${msg.id}', '${escapeHtml(msg.username)}', '${escapeHtml(msg.text || 'GIF')}')" title="Reply">💬</button>
    </div>
  `;

  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function replyToMessage(messageId, messageUsername, messageText) {
  replyingTo = { id: messageId, username: messageUsername, text: messageText };
  
  document.getElementById('replyUsername').textContent = messageUsername;
  document.getElementById('replyPreview').textContent = messageText.substring(0, 100);
  document.getElementById('replyIndicator').style.display = 'block';
  document.getElementById('messageInput').focus();
}

function cancelReply() {
  replyingTo = null;
  document.getElementById('replyIndicator').style.display = 'none';
}

// ==================== REACTIONS ====================

function openReactionPicker(messageId) {
  currentMessageIdForReaction = messageId;
  openModal('reactionPickerModal');
}

function loadReactionCategory(category) {
  const grid = document.getElementById('reactionGrid');
  const emojis = emojiCategories[category] || [];
  
  grid.innerHTML = emojis.map(emoji => 
    `<div class="emoji-reaction" onclick="addReactionToMessage('${emoji}')">${emoji}</div>`
  ).join('');
}

function addReactionToMessage(emoji) {
  if (!currentMessageIdForReaction) return;
  
  socket.emit('addReaction', {
    messageId: currentMessageIdForReaction,
    emoji: emoji,
    username: username
  });
  
  closeModal('reactionPickerModal');
}

function toggleReaction(messageId, emoji) {
  socket.emit('addReaction', {
    messageId: messageId,
    emoji: emoji,
    username: username
  });
}

function updateReactions(messageId, reactions) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageEl) return;

  const existingReactions = messageEl.querySelector('.message-reactions');
  if (existingReactions) {
    existingReactions.remove();
  }

  if (Object.keys(reactions).length === 0) return;

  let reactionsHTML = '<div class="message-reactions">';
  for (const [emoji, users] of Object.entries(reactions)) {
    const isActive = users.includes(username);
    reactionsHTML += `
      <div class="reaction ${isActive ? 'active' : ''}" onclick="toggleReaction('${messageId}', '${emoji}')">
        <span class="reaction-emoji">${emoji}</span>
        <span class="reaction-count">${users.length}</span>
      </div>
    `;
  }
  reactionsHTML += '</div>';

  const messageBody = messageEl.querySelector('.message-body');
  messageBody.insertAdjacentHTML('beforeend', reactionsHTML);
}

// ==================== GIF SEARCH ====================

async function searchGifs(query) {
  const grid = document.getElementById('gifGrid');
  grid.innerHTML = '<div class="gif-loading">Searching GIFs...</div>';

  try {
    const endpoint = query === 'trending' 
      ? `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`
      : `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`;
    
    const response = await fetch(endpoint);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      grid.innerHTML = data.results.map(gif => {
        const url = gif.media_formats.tinygif?.url || gif.media_formats.gif?.url;
        return `
          <div class="gif-item" onclick="sendGif('${url}')">
            <img src="${url}" alt="${gif.content_description}">
          </div>
        `;
      }).join('');
    } else {
      grid.innerHTML = '<div class="gif-loading">No GIFs found. Try another search!</div>';
    }
  } catch (error) {
    console.error('GIF search error:', error);
    grid.innerHTML = '<div class="gif-loading">Error loading GIFs. Please try again.</div>';
  }
}

function openGifPicker() {
  openModal('gifPickerModal');
  if (document.getElementById('gifGrid').children.length === 1) {
    searchGifs('trending');
  }
}

function insertEmojiIntoMessage() {
  const emojis = ['😀', '😃', '😄', '😁', '😊', '😎', '😍', '🥰', '😘', '😂', '🤣', '😭', '😱', '🤔', '👍', '❤️'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const input = document.getElementById('messageInput');
  input.value += emoji;
  input.focus();
}

// ==================== VOICE CHAT ====================

function showVoiceChannels() {
  alert('Click on a voice channel in the sidebar to join!');
}

function joinVoiceChannel(channel) {
  currentVoiceChannel = channel;
  document.getElementById('joiningVoiceChannel').textContent = channel.replace('voice-', '').toUpperCase();
  openModal('voiceJoinModal');
}

async function confirmJoinVoice() {
  closeModal('voiceJoinModal');
  
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    
    inVoiceChannel = true;
    document.getElementById('voicePanel').classList.add('active');
    document.getElementById('voiceChannelName').textContent = currentVoiceChannel.replace('voice-', '').toUpperCase();
    
    socket.emit('joinVoice', {
      username,
      channel: currentVoiceChannel,
      serverId: currentServer,
      avatar: selectedAvatar
    });
    
    showSystemMessage(`You joined voice channel: ${currentVoiceChannel}`);
  } catch (error) {
    console.error('Microphone access error:', error);
    alert('Could not access microphone. Please check your permissions.');
  }
}

function leaveVoiceChannel() {
  if (voiceStream) {
    voiceStream.getTracks().forEach(track => track.stop());
    voiceStream = null;
  }
  
  socket.emit('leaveVoice', {
    username,
    channel: currentVoiceChannel,
    serverId: currentServer
  });
  
  inVoiceChannel = false;
  currentVoiceChannel = null;
  document.getElementById('voicePanel').classList.remove('active');
  
  showSystemMessage('You left the voice channel');
}

function toggleMute() {
  if (!voiceStream) return;
  
  isMuted = !isMuted;
  voiceStream.getAudioTracks().forEach(track => {
    track.enabled = !isMuted;
  });
  
  const btn = document.getElementById('muteMicBtn');
  btn.classList.toggle('muted', isMuted);
  btn.querySelector('span').textContent = isMuted ? '🔇' : '🎤';
  btn.title = isMuted ? 'Unmute' : 'Mute';
}

function toggleDeafen() {
  isDeafened = !isDeafened;
  const btn = document.getElementById('deafenBtn');
  btn.classList.toggle('deafened', isDeafened);
  btn.querySelector('span').textContent = isDeafened ? '🔇' : '🔊';
  btn.title = isDeafened ? 'Undeafen' : 'Deafen';
}

function shareScreen() {
  alert('Screen sharing feature coming soon!');
}

function addVoiceParticipant(data) {
  const container = document.getElementById('voiceParticipants');
  const existingParticipant = container.querySelector(`[data-username="${data.username}"]`);
  
  if (existingParticipant) return;
  
  const div = document.createElement('div');
  div.className = 'voice-participant';
  div.dataset.username = data.username;
  div.innerHTML = `
    <div class="participant-avatar">${data.avatar}</div>
    <div class="participant-info">
      <div class="participant-name">${escapeHtml(data.username)}</div>
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

function saveProfile() {
  const newUsername = document.getElementById('editUsername').value.trim();
  const newBio = document.getElementById('editBio').value.trim();
  
  if (newUsername && newUsername !== username) {
    const oldUsername = username;
    username = newUsername;
    document.getElementById('myUsername').textContent = username;
    socket.emit('usernameChange', { oldUsername, newUsername });
  }
  
  if (selectedAvatar) {
    document.getElementById('myAvatar').querySelector('.avatar-img').textContent = selectedAvatar;
  }
  
  userBio = newBio || 'Hey there! I use Patecord.';
  
  localStorage.setItem('userProfile', JSON.stringify({
    username,
    email: userEmail,
    avatar: selectedAvatar,
    bio: userBio
  }));
  
  socket.emit('profileUpdate', { username, avatar: selectedAvatar, bio: userBio });
  closeModal('editProfileModal');
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
    <div class="member">
      <div class="member-avatar">
        <div class="avatar-img">${user.avatar || '😺'}</div>
        <div class="status-indicator ${user.status || 'online'}"></div>
      </div>
      <span class="member-name">${escapeHtml(user.username)}</span>
    </div>
  `).join('');
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
