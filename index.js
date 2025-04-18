const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// 多人排隊佇列
const waitingUsers = [];
const questions = [
  '喜歡什麼汽車？日系 或 美系',
  '喜歡哪種飲料？可樂 或 果汁',
  '喜歡貓還是狗？貓 或 狗'
];

io.on('connection', (socket) => {
  console.log('使用者連線:', socket.id);
  socket.partner = null;
  socket.nickname = '';
  socket.answers = [];

  socket.on('start_pairing', ({ nickname }) => {
    socket.nickname = nickname;
    socket.answers = [];
    socket.partner = null;

    // 放入佇列並檢查配對
    waitingUsers.push(socket);
    tryPairing();
  });

  function tryPairing() {
    if (waitingUsers.length < 2) return;

    const user1 = waitingUsers.shift();
    const user2 = waitingUsers.shift();

    user1.partner = user2;
    user2.partner = user1;

    user1.emit('paired', questions);
    user2.emit('paired', questions);
  }

  socket.on('answer_question', (answers) => {
    socket.answers = answers;

    const partner = socket.partner;
    if (partner && partner.answers.length === questions.length) {
      // 雙方都回答完畢，進行比較
      const matched = answers.filter((ans, i) => ans === partner.answers[i]).length;

      if (matched >= 2) {
        socket.emit('question_matched', partner.answers);
        partner.emit('question_matched', socket.answers);
      } else {
        socket.emit('question_failed');
        partner.emit('question_failed');

        // 回到等待配對
        socket.partner = null;
        partner.partner = null;
        socket.answers = [];
        partner.answers = [];
        waitingUsers.push(socket, partner);
      }
    }
  });

  socket.on('message', (msg) => {
    if (socket.partner) {
      socket.partner.emit('message', {
        from: socket.nickname || '匿名',
        text: msg
      });
    }
  });

  socket.on('disconnect', () => {
    if (socket.partner) {
      socket.partner.emit('partner_left');
      socket.partner.partner = null;
    } else {
      const index = waitingUsers.indexOf(socket);
      if (index !== -1) waitingUsers.splice(index, 1);
    }
  });

  socket.on('leave', () => {
    if (socket.partner) {
      socket.partner.emit('partner_left');
      socket.partner.partner = null;
    }
    socket.partner = null;
    socket.answers = [];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
