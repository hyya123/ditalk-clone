const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let waitingUser = null;
const question = '喜歡什麼汽車？日系 或是 美系';

io.on('connection', (socket) => {
  console.log('使用者連線:', socket.id);
  socket.partner = null;
  socket.role = null;
  socket.answer = null;

  function tryPairing() {
    if (waitingUser && waitingUser !== socket) {
      const partner = waitingUser;
      waitingUser = null;

      socket.partner = partner;
      partner.partner = socket;

      socket.role = 'A';
      partner.role = 'B';

      socket.emit('paired', { role: 'A' });
      partner.emit('paired', { role: 'B' });

      socket.emit('ask_question', question);
      partner.emit('ask_question', question);
    } else {
      waitingUser = socket;
      socket.emit('waiting');
    }
  }

  // 一開始就執行配對
  tryPairing();

  socket.on('leave', () => {
    console.log('使用者主動離開:', socket.id);

    if (socket.partner) {
      socket.partner.emit('partner_left');
      socket.partner.partner = null;
    }

    socket.partner = null;
    socket.answer = null;

    tryPairing(); // 重新配對
  });

  socket.on('answer_question', (answer) => {
    socket.answer = answer;

    const partner = socket.partner;
    if (partner && partner.answer) {
      // 雙方都已回答
      if (partner.answer === socket.answer) {
        socket.emit('question_matched');
        partner.emit('question_matched');
      } else {
        socket.emit('question_failed');
        partner.emit('question_failed');
        // 解除配對
        socket.partner = null;
        partner.partner = null;
        socket.answer = null;
        partner.answer = null;
        tryPairing();
        tryPairing();
      }
    }
  });

  socket.on('message', (msg) => {
    if (socket.partner) {
      socket.partner.emit('message', {
        from: socket.role,
        text: msg
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('使用者離線:', socket.id);
    if (socket.partner) {
      socket.partner.emit('partner_left');
      socket.partner.partner = null;
    } else if (waitingUser === socket) {
      waitingUser = null;
    }
  });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`伺服器啟動於 port ${PORT}`);
});
