const socket = io();

const startBtn = document.getElementById('startBtn');
const nicknameInput = document.getElementById('nicknameInput');
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
  const nickname = nicknameInput.value.trim();
  if (!nickname) {
    alert('請輸入暱稱');
    return;
  }

  socket.emit('leave'); // 離開前一組
  socket.emit('start_pairing', { nickname });
  status.innerText = '等待配對中...';
  messages.innerHTML = '';
  chat.style.display = 'none';
  questionSection.style.display = 'none';
});

socket.on('waiting', () => {
  status.innerText = '等待配對中...';
});

socket.on('paired', () => {
  status.innerText = '配對成功，請回答問題...';
});

socket.on('ask_question', (question) => {
  questionText.innerText = question;
  questionSection.style.display = 'block';
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
  status.innerText = '賓果 🎉！開始聊天';
  chat.style.display = 'block';
});

socket.on('question_failed', () => {
  alert('雙方答案不一致，配對結束');
  status.innerText = '請重新配對';
  chat.style.display = 'none';
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
  msgElem.textContent = `${from}: ${text}`;
  messages.appendChild(msgElem);
  messages.scrollTop = messages.scrollHeight;
});

socket.on('partner_left', () => {
  alert('對方已離線');
  chat.style.display = 'none';
  status.innerText = '對方離開，請重新配對';
});
