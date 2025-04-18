const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

let waitingRoom = []; // 等待中的使用者
let rooms = {};       // 配對成功的三人聊天室

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  waitingRoom.push(socket);

  if (waitingRoom.length >= 3) {
    const roomId = `room-${Date.now()}`;
    const members = waitingRoom.splice(0, 3);
    rooms[roomId] = members;

    members.forEach(s => {
      s.join(roomId);
      s.roomId = roomId;
      s.emit('group_paired', { roomId });
    });
  } else {
    socket.emit('waiting');
  }

  socket.on('message', (msg) => {
    if (socket.roomId) {
      io.to(socket.roomId).emit('message', { from: socket.id, text: msg });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // 從等待區移除
    waitingRoom = waitingRoom.filter(s => s !== socket);

    if (socket.roomId) {
      const room = rooms[socket.roomId];
      if (room) {
        room.forEach(s => {
          if (s !== socket) {
            s.emit('partner_left');
            s.leave(socket.roomId);
            s.roomId = null;
          }
        });
        delete rooms[socket.roomId];
      }
    }
  });

  socket.on('leave', () => {
    if (socket.roomId) {
      const room = rooms[socket.roomId];
      if (room) {
        room.forEach(s => {
          if (s !== socket) {
            s.emit('partner_left');
            s.leave(socket.roomId);
            s.roomId = null;
          }
        });
        delete rooms[socket.roomId];
      }
      socket.roomId = null;
    } else {
      waitingRoom = waitingRoom.filter(s => s !== socket);
    }
    socket.emit('waiting');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
