const io = require('socket.io-client');
const socket = io('http://127.0.0.1:8080', { query: "username=alice" });

socket.on('connect', () => {
  console.log('Connected to server.');
});

socket.on('error', console.log);

socket.on('chat error', console.log);

socket.on('message', (data, cb) => {
  console.log((data.headers.response ? '(response) ' : '') + data.headers.sent_by + ': ' + data.data);

  cb(true, { dt: data.headers.id });

  socket.emit('send message', request('sussy baka', {sent_to: 'bob', response: data.headers.id}), console.log);
});

socket.on('delete', (data) => {
  console.log('message [' + data.message + '] deleted by: ' + data.sender);
});

socket.on('seen', (data) => {
  console.log('message seen by: ' + data.target);
});

socket.on('typing', (data) => {
  console.log(data.sender + ' is typing. . .');
});

socket.on('delivered', (data) => {
  console.log('message delivered to: ' + data.target);
});

function request(data, headers = {}) {
  return {
    headers,
    data
  }
}

const local_socket = io('http://127.0.0.1:9090');

local_socket.on('connect', () => {
  local_socket.emit('send event');
  local_socket.emit('send event', { event: 'dsgsdg', payload: 'ssfdsfg', uuid: 'sfsdsf' });
  local_socket.emit('send event', { event: 'friend_request', payload: 'ssfdsfg', uuid: 'sfsdsf' });
  local_socket.emit('send event', { event: 'friend_request', payload: 'ssfdsfg', uuid: 'aaa' });
  local_socket.emit('send event', { event: 'test', payload: 'ssfdsfg', uuid: 'aaa' });
});

local_socket.on('local error', console.log);