const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const servers = {
  general: { 
    name: 'General Server',
    icon: '🐱',
    channels: ['general', 'random', 'dev', 'memes'], 
    messages: {} 
  },
  dev: { 
    name: 'Development',
    icon: '⚙️',
    channels: ['general', 'frontend', 'backend'], 
    messages: {} 
  },
  gaming: { 
    name: 'Gaming Hub',
    icon: '🎮',
    channels: ['general', 'pc', 'console'], 
    messages: {} 
  }
};

const users = new Map();
const channelUsers = {};
const voiceChannels = {};

function getChannelKey(serverId, channel) {
  return `${serverId}-${channel}`;
}

function getVoiceChannelKey(serverId, channel) {
  return `voice-${serverId}-${channel}`;
}

function getUsersInChannel(serverId, channel) {
  const key = getChannelKey(serverId, channel);
  if (!channelUsers[key]) channelUsers[key] = new Set();
  return channelUsers[key];
}

function broadcastUserList(serverId, channel) {
  const key = getChannelKey(serverId, channel);
  const usersInChannel = Array.from(getUsersInChannel(serverId, channel));
  const userList = usersInChannel.map(socketId => users.get(socketId)).filter(Boolean);
  io.to(key).emit('onlineUsers', { users: userList });
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (data) => {
    const { username, serverId, channel, avatar, status, bio } = data;
    
    if (users.has(socket.id)) {
      const prevData = users.get(socket.id);
      const prevKey = getChannelKey(prevData.serverId, prevData.channel);
      socket.leave(prevKey);
      getUsersInChannel(prevData.serverId, prevData.channel).delete(socket.id);
      broadcastUserList(prevData.serverId, prevData.channel);
      io.to(prevKey).emit('userLeft', { username: prevData.username });
    }
    
    users.set(socket.id, { 
      username, 
      serverId, 
      channel, 
      avatar: avatar || '😺', 
      status: status || 'online',
      bio: bio || 'Hey there! I use Patecord.'
    });
    
    const channelKey = getChannelKey(serverId, channel);
    socket.join(channelKey);
    getUsersInChannel(serverId, channel).add(socket.id);
    
    if (!servers[serverId]) {
      servers[serverId] = { 
        name: 'Custom Server',
        icon: '🏠',
        channels: [channel], 
        messages: {} 
      };
    }
    if (!servers[serverId].messages[channel]) {
      servers[serverId].messages[channel] = [];
    }
    
    socket.emit('initMessages', servers[serverId].messages[channel]);
    socket.to(channelKey).emit('userJoined', { username });
    broadcastUserList(serverId, channel);
    
    console.log(`${username} joined ${serverId}/${channel}`);
  });

  socket.on('message', (msg) => {
    const { serverId, channel } = msg;
    const channelKey = getChannelKey(serverId, channel);
    
    if (!servers[serverId].messages[channel]) {
      servers[serverId].messages[channel] = [];
    }
    
    if (!msg.reactions) msg.reactions = {};
    
    servers[serverId].messages[channel].push(msg);
    
    // Keep only last 100 messages per channel
    if (servers[serverId].messages[channel].length > 100) {
      servers[serverId].messages[channel].shift();
    }
    
    io.to(channelKey).emit('newMessage', msg);
    console.log(`Message in ${serverId}/${channel} from ${msg.username}`);
  });

  socket.on('addReaction', (data) => {
    const { messageId, emoji, username } = data;
    const userData = users.get(socket.id);
    
    if (!userData) return;
    
    const { serverId, channel } = userData;
    const messages = servers[serverId]?.messages[channel];
    
    if (!messages) return;
    
    const message = messages.find(m => m.id === messageId);
    if (message) {
      if (!message.reactions) message.reactions = {};
      if (!message.reactions[emoji]) message.reactions[emoji] = [];
      
      const userIndex = message.reactions[emoji].indexOf(username);
      if (userIndex === -1) {
        message.reactions[emoji].push(username);
      } else {
        message.reactions[emoji].splice(userIndex, 1);
        if (message.reactions[emoji].length === 0) {
          delete message.reactions[emoji];
        }
      }
      
      const channelKey = getChannelKey(serverId, channel);
      io.to(channelKey).emit('reactionAdded', { 
        messageId, 
        reactions: message.reactions 
      });
    }
  });

  socket.on('typing', (data) => {
    const { username, serverId, channel } = data;
    socket.to(getChannelKey(serverId, channel)).emit('userTyping', { username, channel });
  });

  socket.on('stopTyping', (data) => {
    const { serverId, channel } = data;
    socket.to(getChannelKey(serverId, channel)).emit('userStopTyping');
  });

  socket.on('statusChange', (data) => {
    const userData = users.get(socket.id);
    if (userData) {
      userData.status = data.status;
      users.set(socket.id, userData);
      broadcastUserList(userData.serverId, userData.channel);
    }
  });

  socket.on('profileUpdate', (data) => {
    const userData = users.get(socket.id);
    if (userData) {
      if (data.avatar) userData.avatar = data.avatar;
      if (data.bio) userData.bio = data.bio;
      users.set(socket.id, userData);
      broadcastUserList(userData.serverId, userData.channel);
    }
  });

  socket.on('usernameChange', (data) => {
    const { oldUsername, newUsername } = data;
    const userData = users.get(socket.id);
    if (userData) {
      userData.username = newUsername;
      users.set(socket.id, userData);
      
      const channelKey = getChannelKey(userData.serverId, userData.channel);
      io.to(channelKey).emit('userJoined', { username: newUsername });
      broadcastUserList(userData.serverId, userData.channel);
      
      console.log(`User renamed: ${oldUsername} -> ${newUsername}`);
    }
  });

  socket.on('createServer', (serverData) => {
    const { id, name, icon, channels } = serverData;
    
    servers[id] = {
      name,
      icon,
      channels: channels || ['general'],
      messages: {}
    };
    
    // Initialize message storage for channels
    (channels || ['general']).forEach(channel => {
      servers[id].messages[channel] = [];
    });
    
    // Broadcast to all connected clients
    io.emit('serverCreated', serverData);
    
    console.log(`Server created: ${name} (${id}) by ${serverData.creator}`);
  });

  socket.on('disconnect', () => {
    const userData = users.get(socket.id);
    if (userData) {
      const { username, serverId, channel } = userData;
      const channelKey = getChannelKey(serverId, channel);
      getUsersInChannel(serverId, channel).delete(socket.id);
      socket.to(channelKey).emit('userLeft', { username });
      broadcastUserList(serverId, channel);
      console.log(`${username} disconnected`);
    }
    users.delete(socket.id);
  });

  // Voice channel handlers
  socket.on('joinVoice', (data) => {
    const { username, channel, serverId, avatar } = data;
    const voiceKey = getVoiceChannelKey(serverId, channel);
    
    if (!voiceChannels[voiceKey]) {
      voiceChannels[voiceKey] = new Set();
    }
    
    voiceChannels[voiceKey].add(socket.id);
    socket.join(voiceKey);
    
    const voiceUserData = { username, avatar, socketId: socket.id };
    
    // Notify others in the voice channel
    socket.to(voiceKey).emit('voiceUserJoined', voiceUserData);
    
    // Send current voice users to the joining user
    const currentUsers = Array.from(voiceChannels[voiceKey])
      .map(id => users.get(id))
      .filter(Boolean)
      .map(u => ({ username: u.username, avatar: u.avatar }));
    
    socket.emit('voiceUsersUpdate', { users: currentUsers });
    
    console.log(`${username} joined voice channel: ${channel}`);
  });

  socket.on('leaveVoice', (data) => {
    const { username, channel, serverId } = data;
    const voiceKey = getVoiceChannelKey(serverId, channel);
    
    if (voiceChannels[voiceKey]) {
      voiceChannels[voiceKey].delete(socket.id);
      socket.leave(voiceKey);
      socket.to(voiceKey).emit('voiceUserLeft', { username });
      console.log(`${username} left voice channel: ${channel}`);
    }
  });

  socket.on('voiceSignal', (data) => {
    const { to, signal } = data;
    io.to(to).emit('voiceSignal', {
      from: socket.id,
      signal
    });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🐱 PATECORD SERVER - ENHANCED VERSION                  ║
║                                                           ║
║   🚀 Server running on http://localhost:${PORT}              ║
║                                                           ║
║   ✨ NEW FEATURES:                                        ║
║   ✓ Reply to messages                                    ║
║   ✓ Emoji reactions (100+ emojis)                        ║
║   ✓ GIF search & send (Tenor API)                        ║
║   ✓ Create custom servers                                ║
║   ✓ Edit profile (avatar, username, bio)                 ║
║   ✓ Message threading with replies                       ║
║   ✓ Enhanced UI with smooth animations                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
