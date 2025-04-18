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

let questions = [];
let answers = [];
let questionIndex = 0;

startBtn.addEventListener('click', () => {
  const nickname = nicknameInput.value.trim();
  if (!nickname) {
    alert('請輸入暱稱');
    return;
  }

  socket.emit('leave');
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

socket.on('ask_question', (qs) => {
  questions = qs;
  answers = [];
  questionIndex = 0;
  showNextQuestion();
});

function showNextQuestion() {
  if (questionIndex < questions.length) {
    questionText.innerText = questions[questionIndex];
    answerInput.value = '';
    questionSection.style.display = 'block';
  } else {
    // 全部回答完畢
    questionSection.style.display = 'none';
    socket.emit('answer_question', answers);
    status.innerText = '等待對方回答中...';
  }
}

submitAnswer.addEventListener('click', () => {
  const answer = answerInput.value.trim();
  if (answer) {
    answers.push(answer);
    questionIndex++;
    showNextQuestion();
  }
});

socket.on('question_matched', ({ partnerNickname, answers }) => {
  status.innerText = `賓果 🎉！開始聊天\n你配對到「${partnerNickname}」`;

  // 顯示雙方回答
  messages.innerHTML = `<div style="color:gray; font-size: 0.9em;">對方回答：${answers.join(' / ')}</div>`;
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
    const msgElem = document.createElement('div');
    msgElem.textContent = `我: ${text}`;
    msgElem.style.fontWeight = 'bold';
    messages.appendChild(msgElem);
    messageInput.value = '';
    messages.scrollTop = messages.scrollHeight;
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
