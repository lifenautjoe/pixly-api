import { Server, Socket } from 'socket.io';

class ChatService {
  static readonly events = {
    NEW_MESSAGE: 'newMessage',
    NEW_USER_STATUS: 'newUserStatus',
    NEW_ROOM_STATUS: 'newRoomStatus',
  };

  static readonly actions = {
    JOIN_ROOM: 'joinRoom',
    SEND_MESSAGE: 'sendMessage',
    UPDATE_STATUS: 'updateStatus',
  };

  private rooms = {};

  constructor(private io: Server) {
    io.on('connection', this.onConnection);
  }

  private onConnection(socket: Socket) {
    socket.on(ChatService.actions.JOIN_ROOM, data => this.onWantsToJoinRoom(socket, data));

    socket.on(ChatService.actions.SEND_MESSAGE, data => this.onWantsToSendMessage(socket, data));

    socket.on(ChatService.actions.UPDATE_STATUS, data => this.onWantsToUpdateStatus(socket, data));

    socket.on('disconnecting', this.onDisconnecting);
  }

  private onDisconnecting(socket: Socket) {}

  private onWantsToJoinRoom(socket: Socket, { room }: any) {
    socket.join(room);
  }

  private onWantsToLeaveRoom(socket: Socket, { room }: any) {
    socket.leave(room);
  }

  private onWantsToSendMessage(socket: Socket, { room, message }: any) {
    socket.to(room).emit(ChatService.events.NEW_MESSAGE, message);
  }

  private onWantsToUpdateStatus(socket: Socket, { x, y, room }: any) {
    socket.to(room).emit(ChatService.events.NEW_USER_STATUS, {
      x,
      y,
    });
  }

  private getRoomWithName(roomName: string) {
    const room = this.rooms[roomName];
    if (room) return room;

    return (this.rooms[roomName] = {
      users: [],
    });
  }
}

export default ChatService;
