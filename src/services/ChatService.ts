import { IUser } from './../models/user/IUser';
import { IRoom } from './../models/room/IRoom';
import { IUserStatusUpdateEventData } from './../../core/interfaces/event-data/UserUpdateEventData';
import { Message } from '../../core/models/message/Message';
import { INewMessageEventData } from '../../core/interfaces/event-data/INewMessageEventData';
import { IJoinedRoomEventData } from '../../core/interfaces/event-data/IJoinedRoomEventData';
import { IAuthenticatedEventData } from '../../core/interfaces/event-data/IAuthenticatedEventData';
import { UpdateStatusActionDto } from './../../core/dtos/UpdateStatusActionDto';
import { SendMessageActionDto } from './../../core/dtos/SendMessageActionDto';
import { JoinRoomActionDto } from './../../core/dtos/JoinRoomActionDto';
import { AuthenticateActionDto } from '../../core/dtos/AuthenticateActionDto';
import { IErrorEventData } from '../../core/interfaces/event-data/IErrorEventData';
import { plainToClass } from 'class-transformer';
import { LoginAction } from '../../core/dtos/LoginAction';
import { Server, Socket } from 'socket.io';
import { PixlyProtocol } from '../../core/protocol';
import { validateSync, ValidationError } from 'class-validator';
import PixlyInputError from '../errors/PixlyInputError';
import PixlyError from '../errors/PixlyError';
import { deserializeRoom, deserializeUser } from '../utils/modelDeserializers';
import { serializeMessage, serializeRoom, serializeUser } from '../utils/modelSerializers';

class ChatService {
  private rooms: { [roomName: string]: IRoom } = {};
  private users: { [userSocketId: string]: IUser } = {};

  constructor(private io: Server) {
    io.on('connection', this.onConnection);
  }

  private onConnection(socket: Socket) {
    this.installActions(socket);

    socket.on('disconnecting', this.onDisconnecting);
  }

  private installActions(socket: Socket) {
    socket.on(PixlyProtocol.actions.AUTHENTICATE, rawData =>
      this.validateData<AuthenticateActionDto>({
        socket,
        rawData,
        dto: AuthenticateActionDto,
        onValid: this.onWantsToAuthenticate,
      }),
    );

    socket.on(PixlyProtocol.actions.JOIN_ROOM, rawData =>
      this.resolveUser({
        socket,
        onUser: user =>
          this.validateData<JoinRoomActionDto>({
            user,
            socket,
            rawData,
            dto: JoinRoomActionDto,
            onValid: this.onWantsToJoinRoom,
          }),
      }),
    );

    socket.on(PixlyProtocol.actions.SEND_MESSAGE, rawData =>
      this.resolveUser({
        socket,
        onUser: user =>
          this.validateData<SendMessageActionDto>({
            user,
            socket,
            rawData,
            dto: SendMessageActionDto,
            onValid: this.onWantsToSendMessage,
          }),
      }),
    );

    socket.on(PixlyProtocol.actions.UPDATE_STATUS, rawData =>
      this.resolveUser({
        socket,
        onUser: user =>
          this.validateData<UpdateStatusActionDto>({
            user,
            socket,
            rawData,
            dto: UpdateStatusActionDto,
            onValid: this.onWantsToUpdateStatus,
          }),
      }),
    );
  }

  /**
   * This validates the incoming socket data against the provided dto and handles
   * validation failure
   */
  private validateData<T>({ socket, rawData, dto, onValid, user }: ValidationData<T>) {
    if (Array.isArray(rawData)) {
      throw new Error('Unexpected input');
    }

    // For some reason, TS doesnt catch that we did an array check before already
    const data = (plainToClass(dto, rawData) as unknown) as T;
    const validationErrors = validateSync(data);

    if (validationErrors.length > 0) {
      // Oh noes
      this.onValidationErrors(socket, validationErrors);
    } else {
      // All good
      onValid(socket, data, user);
    }
  }

  /**
   * Resolves the user from a given socket and calls onUser when resolved
   */
  private resolveUser({ socket, onUser: onAuthenticated }: ResolveUserData) {
    const user = this.getUserWithSocketId(socket.id);

    if (!user) {
      throw new Error('Please authenticate first');
    }

    onAuthenticated(user);
  }

  private onDisconnecting(socket: Socket) {
    this.removeUserWithSocketId(socket.id);
  }

  private onWantsToAuthenticate(socket: Socket, { userName, userAvatar }: LoginAction) {
    const socketId = socket.id;

    let user = this.getUserWithSocketId(socketId);

    if (!user) {
      user = deserializeUser({
        name: userName,
        avatar: userAvatar,
      });

      const validationErrors = validateSync(user);

      if (validationErrors.length > 0) {
        // We have errors
        this.onValidationErrors(socket, validationErrors);
      } else {
        // All good
        this.storeUserWithSocketId(user, socketId);
        this.emitAuthenticatedEvent(socket, user);
      }
    }
  }

  private onWantsToJoinRoom(socket: Socket, { roomName }: JoinRoomActionDto, user: IUser) {
    if (user.room) {
      throw new PixlyError('User is already part of room.');
    }

    const room = this.getRoomWithName(roomName);

    room.addUser(user);
    user.room = room;

    socket.join(roomName);

    this.emitJoinedRoomEvent(socket, room);
  }

  private onWantsToSendMessage(socket: Socket, { messageText }: SendMessageActionDto, { room }: IUser) {
    const message = new Message(messageText);

    this.emitNewMessageEvent(socket, room, message);
  }

  private onWantsToUpdateStatus(socket: Socket, { x, y }: UpdateStatusActionDto, user: IUser) {
    user.updateStatus(x, y);

    this.emitUserStatusUpdateEvent(socket, user.room, user);
  }

  private onValidationErrors(socket: Socket, [firstValidationError]: ValidationError[]) {
    const pixlyException = new PixlyInputError(firstValidationError.toString());
    this.onError(socket, pixlyException);
  }

  private onError(socket: Socket, error: Error | PixlyInputError) {
    const isProtocolError = error instanceof PixlyInputError;

    this.emitErrorEvent(socket, {
      // If its a protocol error, it has a nice message, if its not, don't expose internals.
      message: isProtocolError ? error.message : 'Server error',
    });

    if (!isProtocolError) {
      // Throw to make sure we get logs of it
      throw error;
    }
  }

  private emitAuthenticatedEvent(socket: Socket, user: IUser) {
    const eventData: IAuthenticatedEventData = {
      user: serializeUser(user),
    };

    socket.emit(PixlyProtocol.events.AUTHENTICATED, eventData);
  }

  private emitJoinedRoomEvent(socket: Socket, room: IRoom) {
    const eventData: IJoinedRoomEventData = {
      room: serializeRoom(room),
    };

    socket.emit(PixlyProtocol.events.JOINED_ROOM, eventData);
  }

  private emitNewMessageEvent(socket: Socket, room: IRoom, message: Message) {
    const eventData: INewMessageEventData = {
      message: serializeMessage(message),
    };

    socket.to(room.name).emit(PixlyProtocol.events.NEW_MESSAGE, eventData);
  }

  private emitUserStatusUpdateEvent(socket: Socket, room: IRoom, user: IUser) {
    const eventData: IUserStatusUpdateEventData = {
      user: serializeUser(user),
    };

    socket.to(room.name).emit(PixlyProtocol.events.USER_STATUS_UPDATE, eventData);
  }

  private emitErrorEvent(socket: Socket, eventData: IErrorEventData) {
    socket.emit(PixlyProtocol.events.ERROR, eventData);
  }

  private getRoomWithName(roomName: string): IRoom {
    let room = this.rooms[roomName];
    if (room) return room;

    room = deserializeRoom({
      name: roomName,
    });

    this.storeRoomWithName(room, roomName);

    return room;
  }

  private storeRoomWithName(room: IRoom, name: string) {
    this.rooms[name] = room;
  }

  private getUserWithSocketId(socketId: string): IUser {
    return this.users[socketId];
  }

  private storeUserWithSocketId(user: IUser, socketId: string) {
    this.users[socketId] = user;
  }

  private removeUserWithSocketId(socketId: string) {
    delete this.users[socketId];
  }
}

interface ValidationData<T> {
  socket: Socket;
  rawData: any;
  dto: any;
  user?: IUser;
  onValid: (socket: Socket, data: T, user?: IUser) => void;
}

interface ResolveUserData {
  socket: Socket;
  onUser: (user: IUser) => void;
}

export default ChatService;
