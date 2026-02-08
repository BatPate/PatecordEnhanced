const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);

// Replace with your actual Tenor API key
const TENOR_API_KEY = 'YOUR_TENOR_API_KEY';

// CORS for socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // restrict in production
    methods: ['GET', 'POST']
  }
});

app.use(express.static(__dirname));
app.use(express.json());

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// File-based user storage
const fs = require('fs');
const USERS_FILE = 'users.json';

// Load users from file at startup
let users = {};
if (fs.existsSync(USERS_FILE)) {
  users = JSON.parse(fs.readFileSync(USERS_FILE));
}

// Save users to file
function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Helper: register user
async function registerUser(email, username, password, avatar) {
  if (users[username]) return { success: false, error: 'Username exists' };
  
  // Check if email exists
  for (const user of Object.values(users)) {
    if (user.email === email) {
      return { success: false, error: 'Email already registered' };
    }
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  users[username] = { 
    email, 
    password: hashedPassword, 
    avatar, 
    bio: 'Hey there! I use Patecord.',
    status: 'online',
    createdAt: new Date().toISOString()
  };
  saveUsers();
  return { 
    success: true, 
    user: { 
      username, 
      email, 
      avatar, 
      bio: 'Hey there! I use Patecord.',
      status: 'online'
    } 
  };
}

// Helper: verify password
async function verifyPassword(username, password) {
  if (!users[username]) return false;
  const user = users[username];
  return await bcrypt.compare(password, user.password);
}

// API: Register
app.post('/api/auth/register', async (req, res) => {
  const { email, username, password, avatar } = req.body;
  
  if (!email || !username || !password) {
    return res.json({ success: false, error: 'All fields are required' });
  }
  
  const result = await registerUser(email, username, password, avatar || '😺');
  if (result.success) {
    res.json({ success: true, user: result.user, token: username });
  } else {
    res.json({ success: false, error: result.error });
  }
});

// API: Verify token
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const username = authHeader.substring(7);
    if (users[username]) {
      const user = users[username];
      res.json({ 
        success: true, 
        user: { 
          username, 
          email: user.email, 
          avatar: user.avatar, 
          bio: user.bio,
          status: user.status || 'online'
        } 
      });
      return;
    }
  }
  res.json({ success: false });
});

// API: Login
app.post('/api/auth/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;
  
  if (!emailOrUsername || !password) {
    return res.json({ success: false, error: 'All fields are required' });
  }
  
  // Check username
  if (users[emailOrUsername]) {
    const user = users[emailOrUsername];
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      return res.json({ 
        success: true, 
        token: emailOrUsername, 
        user: { 
          username: emailOrUsername, 
          email: user.email, 
          avatar: user.avatar, 
          bio: user.bio,
          status: user.status || 'online'
        } 
      });
    }
  }
  
  // Check email
  for (const [username, user] of Object.entries(users)) {
    if (user.email === emailOrUsername) {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        return res.json({ 
          success: true, 
          token: username, 
          user: { 
            username, 
            email: user.email, 
            avatar: user.avatar, 
            bio: user.bio,
            status: user.status || 'online'
          } 
        });
      }
    }
  }
  
  res.json({ success: false, error: 'Invalid credentials' });
});

// API: Update profile
app.put('/api/user/profile', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ success: false, error: 'Unauthorized' });
  }
  
  const currentUsername = authHeader.substring(7);
  if (!users[currentUsername]) {
    return res.json({ success: false, error: 'Invalid token' });
  }
  
  const user = users[currentUsername];
  const { username: newUsername, avatar, bio, status } = req.body;
  
  // Handle username change
  if (newUsername && newUsername !== currentUsername) {
    if (users[newUsername]) {
      return res.json({ success: false, error: 'Username already exists' });
    }
    // Move user to new username key
    users[newUsername] = { ...user };
    delete users[currentUsername];
    
    // Update fields on new username
    if (avatar) users[newUsername].avatar = avatar;
    if (bio !== undefined) users[newUsername].bio = bio;
    if (status) users[newUsername].status = status;
    
    saveUsers();
    return res.json({ 
      success: true, 
      user: { 
        username: newUsername, 
        email: users[newUsername].email, 
        avatar: users[newUsername].avatar, 
        bio: users[newUsername].bio,
        status: users[newUsername].status
      },
      newToken: newUsername
    });
  }
  
  // Update without username change
  if (avatar) users[currentUsername].avatar = avatar;
  if (bio !== undefined) users[currentUsername].bio = bio;
  if (status) users[currentUsername].status = status;
  
  saveUsers();
  res.json({ 
    success: true, 
    user: { 
      username: currentUsername, 
      email: users[currentUsername].email, 
      avatar: users[currentUsername].avatar, 
      bio: users[currentUsername].bio,
      status: users[currentUsername].status
    } 
  });
});

// API: Get user profile by username
app.get('/api/user/:username', (req, res) => {
  const { username } = req.params;
  
  if (!users[username]) {
    return res.json({ success: false, error: 'User not found' });
  }
  
  const user = users[username];
  res.json({
    success: true,
    user: {
      username,
      avatar: user.avatar,
      bio: user.bio,
      status: user.status || 'online',
      createdAt: user.createdAt
    }
  });
});

// API: Get all users (excluding passwords)
app.get('/api/users', (req, res) => {
  const allUsers = Object.entries(users).map(([username, user]) => ({
    username,
    avatar: user.avatar,
    bio: user.bio,
    status: user.status || 'online',
    createdAt: user.createdAt
  }));
  
  res.json({ success: true, users: allUsers });
});

// ==================== SOCKET.IO ====================

const onlineUsers = new Map(); // username -> { socketId, avatar, status, bio }
const channels = new Map(); // "serverId:channel" -> Set of usernames

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // User joins
  socket.on('join', (data) => {
    const { username, serverId, channel, avatar, status, bio } = data;
    
    onlineUsers.set(username, {
      socketId: socket.id,
      avatar: avatar || '😺',
      status: status || 'online',
      bio: bio || 'Hey there! I use Patecord.'
    });
    
    const channelKey = `${serverId}:${channel}`;
    if (!channels.has(channelKey)) {
      channels.set(channelKey, new Set());
    }
    channels.get(channelKey).add(username);
    
    socket.join(channelKey);
    socket.username = username;
    socket.currentChannel = channelKey;
    
    // Broadcast user list to channel
    const channelUsers = Array.from(channels.get(channelKey)).map(u => ({
      username: u,
      avatar: onlineUsers.get(u)?.avatar || '😺',
      status: onlineUsers.get(u)?.status || 'online',
      bio: onlineUsers.get(u)?.bio || 'Hey there! I use Patecord.'
    }));
    
    io.to(channelKey).emit('userList', { users: channelUsers });
    io.to(channelKey).emit('userJoined', { username, avatar, timestamp: Date.now() });
  });
  
  // Message
  socket.on('message', (data) => {
    const { username, text, serverId, channel, avatar, replyTo } = data;
    const channelKey = `${serverId}:${channel}`;
    
    const messageData = {
      id: Date.now() + Math.random(),
      username,
      text,
      avatar: avatar || '😺',
      timestamp: Date.now(),
      reactions: [],
      replyTo: replyTo || null
    };
    
    io.to(channelKey).emit('message', messageData);
  });
  
  // Typing indicators
  socket.on('typing', (data) => {
    const { username, serverId, channel } = data;
    const channelKey = `${serverId}:${channel}`;
    socket.to(channelKey).emit('typing', { username });
  });
  
  socket.on('stopTyping', (data) => {
    const { serverId, channel } = data;
    const channelKey = `${serverId}:${channel}`;
    socket.to(channelKey).emit('stopTyping');
  });
  
  // Reactions
  socket.on('addReaction', (data) => {
    const { messageId, emoji, username, serverId, channel } = data;
    const channelKey = `${serverId}:${channel}`;
    io.to(channelKey).emit('reactionAdded', { messageId, emoji, username });
  });
  
  // Profile updates
  socket.on('profileUpdate', (data) => {
    const { username, avatar, bio } = data;
    
    if (onlineUsers.has(username)) {
      const userData = onlineUsers.get(username);
      userData.avatar = avatar;
      userData.bio = bio;
      onlineUsers.set(username, userData);
    }
    
    // Broadcast to all channels user is in
    io.emit('profileUpdated', { username, avatar, bio });
  });
  
  // Status change
  socket.on('statusChange', (data) => {
    const { username, status } = data;
    
    if (onlineUsers.has(username)) {
      const userData = onlineUsers.get(username);
      userData.status = status;
      onlineUsers.set(username, userData);
    }
    
    io.emit('statusChanged', { username, status });
  });
  
  // Username change
  socket.on('usernameChange', (data) => {
    const { oldUsername, newUsername } = data;
    
    if (onlineUsers.has(oldUsername)) {
      const userData = onlineUsers.get(oldUsername);
      onlineUsers.delete(oldUsername);
      onlineUsers.set(newUsername, userData);
    }
    
    // Update in all channels
    channels.forEach((userSet, channelKey) => {
      if (userSet.has(oldUsername)) {
        userSet.delete(oldUsername);
        userSet.add(newUsername);
      }
    });
    
    io.emit('usernameChanged', { oldUsername, newUsername });
  });
  
  // Voice channel
  socket.on('joinVoice', (data) => {
    const { username, channel, avatar } = data;
    socket.join(`voice:${channel}`);
    io.to(`voice:${channel}`).emit('voiceUserJoined', { username, avatar });
  });
  
  socket.on('leaveVoice', (data) => {
    const { username, channel } = data;
    socket.leave(`voice:${channel}`);
    io.to(`voice:${channel}`).emit('voiceUserLeft', { username });
  });
  
  // Server creation
  socket.on('createServer', (data) => {
    io.emit('serverCreated', data);
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.username) {
      const channelKey = socket.currentChannel;
      
      if (channelKey && channels.has(channelKey)) {
        channels.get(channelKey).delete(socket.username);
        
        const channelUsers = Array.from(channels.get(channelKey)).map(u => ({
          username: u,
          avatar: onlineUsers.get(u)?.avatar || '😺',
          status: onlineUsers.get(u)?.status || 'online',
          bio: onlineUsers.get(u)?.bio || 'Hey there! I use Patecord.'
        }));
        
        io.to(channelKey).emit('userList', { users: channelUsers });
        io.to(channelKey).emit('userLeft', { username: socket.username, timestamp: Date.now() });
      }
      
      onlineUsers.delete(socket.username);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
