const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const waitingUsers = [];
const chatLogs = []; // 🔒 儲存聊天紀錄（後台用）

const QUESTIONS = [
  '喜歡什麼汽車？日系 或 美系',
  '喜歡貓還是狗？',
  '喜歡吃甜還是鹹？'
];

io.on('connection', (socket) => {
  console.log('使用者連線:', socket.id);
  socket.partner = null;
  socket.nickname = '';
  socket.answers = [];

  socket.on('start_pairing', ({ nickname }) => {
    socket.nickname = nickname;
    socket.answers = [];

    // 檢查是否有人在等
    const partner = waitingUsers.find(s => s !== socket && !s.partner);

    if (partner) {
      // 成功配對
      socket.partner = partner;
      partner.partner = socket;

      // 從等待區移除
      const index = waitingUsers.indexOf(partner);
      if (index !== -1) waitingUsers.splice(index, 1);

      // 發送問題
      socket.emit('paired');
      partner.emit('paired');

      socket.emit('ask_question', QUESTIONS);
      partner.emit('ask_question', QUESTIONS);
    } else {
      // 加入等待
      waitingUsers.push(socket);
      socket.emit('waiting');
    }
  });

  socket.on('answer_question', (answers) => {
    socket.answers = answers;
    const partner = socket.partner;

    if (partner && partner.answers.length) {
      // 雙方都回答完了
      const matchCount = answers.reduce((acc, ans, i) => {
        return acc + (ans === partner.answers[i] ? 1 : 0);
      }, 0);

      if (matchCount >= 2) {
        // ✅ 配對成功
        socket.emit('question_matched', { partnerNickname: partner.nickname, answers: partner.answers });
        partner.emit('question_matched', { partnerNickname: socket.nickname, answers: socket.answers });
      } else {
        // ❌ 失敗
        socket.emit('question_failed');
        partner.emit('question_failed');
        socket.partner = null;
        partner.partner = null;
        socket.answers = [];
        partner.answers = [];
      }
    }
  });

  socket.on('message', (msg) => {
    if (socket.partner) {
      socket.partner.emit('message', {
        from: socket.nickname || '匿名',
        text: msg
      });

      // ✅ 儲存後台紀錄
      chatLogs.push({
        timestamp: new Date(),
        from: socket.nickname,
        to: socket.partner.nickname,
        text: msg
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('使用者離線:', socket.id);
    if (socket.partner) {
      socket.partner.emit('partner_left');
      socket.partner.partner = null;
    }

    const index = waitingUsers.indexOf(socket);
    if (index !== -1) waitingUsers.splice(index, 1);
  });

  socket.on('leave', () => {
    if (socket.partner) {
      socket.partner.emit('partner_left');
      socket.partner.partner = null;
    }
    socket.partner = null;
    socket.answers = [];

    const index = waitingUsers.indexOf(socket);
    if (index !== -1) waitingUsers.splice(index, 1);
  });

  // ✅ 查看聊天紀錄（內部用途）
  socket.on('admin_get_logs', () => {
    socket.emit('admin_logs', chatLogs);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`伺服器執行中 http://localhost:${PORT}`);
});
