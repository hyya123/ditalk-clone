const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const question = '喜歡什麼汽車？日系 或 美系';
let waitingQueue = [];

io.on('connection', (socket) => {
  console.log('使用者連線:', socket.id);
  socket.partner = null;
  socket.nickname = '';
  socket.answer = null;

  socket.on('start_pairing', ({ nickname }) => {
    socket.nickname = nickname;
    socket.partner = null;
    socket.answer = null;

    if (waitingQueue.length > 0) {
      const partner = waitingQueue.shift();

      socket.partner = partner;
      partner.partner = socket;

      socket.emit('paired');
      partner.emit('paired');

      socket.emit('ask_question', question);
      partner.emit('ask_question', question);
    } else {
      waitingQueue.push(socket);
      socket.emit('waiting');
    }
  });

  socket.on('answer_question', (answer) => {
    socket.answer = answer;
    const partner = socket.partner;

    if (partner && partner.answer !== null) {
      if (partner.answer === socket.answer) {
        socket.emit('question_matched', { partnerNickname: partner.nickname });
        partner.emit('question_matched', { partnerNickname: socket.nickname });
      } else {
        socket.emit('question_failed');
        partner.emit('question_failed');

        socket.partner = null;
        partner.partner = null;
        socket.answer = null;
        partner.answer = null;
      }
    }
  });

  socket.on('message', (text) => {
    if (socket.partner) {
      socket.partner.emit('message', {
        from: socket.nickname || '匿名',
        text
      });
    }
  });

  socket.on('leave', () => {
    if (socket.partner) {
      socket.partner.emit('partner_left');
      socket.partner.partner = null;
    }

    socket.partner = null;
    socket.answer = null;

    const idx = waitingQueue.indexOf(socket);
    if (idx !== -1) waitingQueue.splice(idx, 1);
  });

  socket.on('disconnect', () => {
    if (socket.partner) {
      socket.partner.emit('partner_left');
      socket.partner.partner = null;
    }

    const idx = waitingQueue.indexOf(socket);
    if (idx !== -1) waitingQueue.splice(idx, 1);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
