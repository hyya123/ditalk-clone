const socket = io();

const startBtn = document.getElementById('startBtn');
const nicknameInput = document.getElementById('nicknameInput');
const status = document.getElementById('status');
const questionSection = document.getElementById('question-section');
const questionText = document.getElementById('question-text');
const chat = document.getElementById('chat');
const messages = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let currentQuestions = [];
let answers = [];

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

socket.on('paired', (questions) => {
  currentQuestions = questions;
  answers = [];
  showQuestion(0);
});

function showQuestion(index) {
  if (index >= currentQuestions.length) return;
  questionText.innerHTML = `
    <p>${currentQuestions[index]}</p>
    <input type="text" id="answer-${index}" placeholder="請輸入答案">
    <button onclick="submitAnswer(${index})">送出答案</button>
  `;
  questionSection.style.display = 'block';
}

window.submitAnswer = function (index) {
  const input = document.getElementById(`answer-${index}`);
  const answer = input.value.trim();
  if (!answer) {
    alert('請輸入答案');
    return;
  }
  answers[index] = answer;
  if (index + 1 < currentQuestions.length) {
    showQuestion(index + 1);
  } else {
    questionSection.style.display = 'none';
    status.innerText = '等待對方回答中...';
    socket.emit('answer_question', answers);
  }
};

socket.on('question_matched', (partnerAnswers) => {
  status.innerText = '賓果 🎉！開始聊天';
  chat.style.display = 'block';

  // 顯示雙方的回答
  const answerSummary = document.createElement('div');
  answerSummary.innerHTML = `
    <p><strong>你的回答:</strong> ${answers.join(', ')}</p>
    <p><strong>對方的回答:</strong> ${partnerAnswers.join(', ')}</p>
    <hr>
  `;
  messages.appendChild(answerSummary);
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
