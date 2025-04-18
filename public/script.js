
const socket = io();

const messages = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');

function addMessageToChat(msg) {
  const item = document.createElement('li');
  item.textContent = msg;
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('message', input.value);
    input.value = '';
  }
});

socket.on('group_paired', ({ roomId }) => {
  addMessageToChat(`✅ 已配對成功，聊天室 ID：${roomId}`);
});

socket.on('message', ({ from, text }) => {
  const selfId = socket.id;
  const shortId = from === selfId ? '我' : from.slice(0, 5);
  addMessageToChat(`👤 ${shortId}：${text}`);
});

socket.on('partner_left', () => {
  addMessageToChat('🚪 有人離開聊天室，聊天結束');
});

socket.on('waiting', () => {
  addMessageToChat('⌛ 等待其他人加入聊天室...');
});
