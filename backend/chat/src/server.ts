import * as io from 'socket.io';
import status_codes from '@config/status_codes';

const server = new io.Server();

const clients: { [key: string]: io.Socket } = {};
const pipeline: Array<io.Socket[]> = [];

server.on('connection', (socket) => {
  socket.on('initialize-session', (data) => {
    const username = data.toString();

    if (Object.values(clients).find((client) => client.id === socket.id)) {
      socket.emit('chat-error', status_codes.SESSION_EXISTS);
      return;
    }

    if (clients[username]) {
      socket.emit('chat-error', status_codes.USERNAME_IN_USE);
      return;
    }

    clients[username] = socket;
    console.log('New session: ' + username);

    socket.emit('chat-error', status_codes.SESSION_INITIALIZED);
  });

  socket.on('start-chat', (data) => {
    const target = data.toString();

    if (!clients[target]) {
      socket.emit('chat-error', status_codes.TARGET_NOT_FOUND);
      return;
    }

    if (clients[target].id === socket.id) {
      socket.emit('chat-error', status_codes.TARGET_SELF);
      return;
    }

    if (pipeline.find((p) => p.includes(socket))) {
      socket.emit('chat-error', status_codes.ALREADY_IN_PIPELINE);
      return;
    }

    if (pipeline.find((p) => p.includes(clients[target]))) {
      socket.emit('chat-error', status_codes.TARGET_ALREADY_IN_PIPELINE);
      return;
    }

    pipeline.push([socket, clients[target]]);

    console.log(`${socket.id} started chat with ${clients[target].id}`);
  });

  socket.on('chat-message', (data) => {
    const message = data.toString();
    const pipe = pipeline.find((p) => p.includes(socket));

    if (!pipe) {
      socket.emit('chat-error', status_codes.NOT_IN_PIPELINE);
      return;
    }

    pipe.forEach((client) => {
      if (client.id !== socket.id) {
        client.emit('chat-message', message);
      }
    });

    console.log(message);
  });

  socket.on('end-chat', () => {
    const pipe = pipeline.find((p) => p.includes(socket));

    if (!pipe) {
      socket.emit('chat-error', status_codes.NOT_IN_PIPELINE);
      return;
    }

    pipe.splice(pipe.indexOf(socket), 1);

    console.log(`${socket.id} ended chat with ${pipe[1].id}`);
  });

  function removeSocketFromClients(socket: io.Socket) {
    const username = Object.keys(clients).find((username) => clients[username] === socket);
    if (username) {
      delete clients[username];

      console.log('Session ended: ' + username);
    }
  }

  socket.on('disconnect', () => removeSocketFromClients(socket));
  socket.on('error', () => removeSocketFromClients(socket));
});

server.listen(8080);
console.log('🏃 on port 8080.');