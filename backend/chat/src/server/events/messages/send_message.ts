import { REQUEST, USER, USERS, USER_REGISTRY } from "@config/types";
import { EventInterface } from "server/interfaces";
import { request_type_middleware } from "server/middleware";
import { Socket } from "socket.io";
import server from '@server';
import status_codes from "@config/status_codes";
import { callbackTimeout, eventError, generateUUID } from "server/utils";

const send_message: EventInterface = {
  name: 'send message',
  data_types: 'string',

  middleware: request_type_middleware,

  handler(request: REQUEST, cb: Function, socket: Socket, users: USER_REGISTRY, sender: USER): void {
    const { headers, data } = request;

    const { sent_to, response } = headers;

    if (!sent_to || !data) return eventError(socket, status_codes.BAD_DATA_FORMAT, cb);

    const target = users.get_by_name(sent_to.toLowerCase());

    if (!target) return eventError(socket, status_codes.TARGET_NOT_FOUND, cb);

    let message_id = '';
    if (data.length > 10) {
      message_id = generateUUID(data.substring(0, 10));
    } else {
      let random_letters = '';
      for (let i = 0; i < 10 - data.length; i++) {
        random_letters += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
      }
      message_id = generateUUID(data + random_letters);
    }

    const message = 
    response ? {
      headers: {
        sent_by: sender.username,
        id: message_id,
        response
      },
      data
    } : {
      headers: {
        sent_by: sender.username,
        id: message_id
      },
      data
    };

    if (sender.unread_messages.includes(target.username)) {
      sender.remove_unread_message(target.username);
      server.sockets.sockets.get(target.socket_id)?.emit('seen', sender.username);
    }

    server.sockets.sockets.get(target.socket_id)?.emit('message', message, callbackTimeout(3 * 1000, (status: any, response: any) => {
      if (status instanceof Error) {
        target.add_unread_message(sender.username);
        return;
      }
    
      if (typeof status !== 'boolean' || !response) return;
    
      if (status) {
        target.remove_unread_message(sender.username);
        server.sockets.sockets.get(sender.socket_id)?.emit('seen', { target: target.username });
      } else {
        target.add_unread_message(sender.username);
        server.sockets.sockets.get(sender.socket_id)?.emit('delivered', { target: target.username });
      }
    }));

    cb(true, message_id);
  }
};

export default send_message; 