const socket = io();
let userRole = null;

const startBtn = document.getElementById('startBtn');
const status = document.getElementById('status');
const questionSection = document.getElementById('question-section');
const questionText = document.getElementById('question-text');
const answerInput = document.getElementById('answerInput');
const submitAnswer = document.getElementById('submitAnswer');
const chat = document.getElementById('chat');
const messages = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

startBtn.addEventListener('click', () => {
  socket.emit('leave'); // 先清空舊配對
  status.innerText = '等待配對中...';
});

socket.on('waiting', () => {
  status.innerText = '等待配對中...';
});

socket.on('paired', ({ role }) => {
  userRole = role;
  status.innerText = `配對成功！你是使用者${role}`;
});

socket.on('ask_question', (question) => {
  questionSection.style.display = 'block';
  questionText.innerText = question;
});

submitAnswer.addEventListener('click', () => {
  const answer = answerInput.value.trim();
  if (answer) {
    socket.emit('answer_question', answer);
    questionSection.style.display = 'none';
    status.innerText = '等待對方回答中...';
  }
});

socket.on('question_matched', () => {
  status.innerText = '回答一致，開始聊天！';
  chat.style.display = 'block';
});

socket.on('question_failed', () => {
  alert('雙方答案不一致，配對結束！');
  chat.style.display = 'none';
  messages.innerHTML = '';
  status.innerText = '請重新配對';
});

sendBtn.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (text) {
    socket.emit('message', text);
    messageInput.value = '';
  }
});

socket.on('message', ({ from, text }) => {
  const msgElem = document.createElement('div');
  msgElem.textContent = `使用者${from}: ${text}`;
  messages.appendChild(msgElem);
  messages.scrollTop = messages.scrollHeight;
});

socket.on('partner_left', () => {
  alert('對方已離線');
  chat.style.display = 'none';
  messages.innerHTML = '';
  status.innerText = '對方離開，請重新配對';
});
