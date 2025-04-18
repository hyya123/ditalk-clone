const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

let waitingUser = null;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  if (waitingUser) {
    // Pair the two users
    const partner = waitingUser;
    waitingUser = null;
    socket.partner = partner;
    partner.partner = socket;

    socket.emit('paired');
    partner.emit('paired');
  } else {
    // No user waiting, put this one in the queue
    waitingUser = socket;
    socket.emit('waiting');
  }

  socket.on('message', (msg) => {
    if (socket.partner) {
      socket.partner.emit('message', msg);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.partner) {
      socket.partner.emit('partner_left');
      socket.partner.partner = null;
    } else if (waitingUser === socket) {
      waitingUser = null;
    }
  });

  socket.on('leave', () => {
    if (socket.partner) {
      socket.partner.emit('partner_left');
      socket.partner.partner = null;
    }
    socket.partner = null;
    if (!waitingUser) {
      waitingUser = socket;
      socket.emit('waiting');
    } else {
      const partner = waitingUser;
      waitingUser = null;
      socket.partner = partner;
      partner.partner = socket;
      socket.emit('paired');
      partner.emit('paired');
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
