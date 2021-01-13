import { IUserData } from "./../core/interfaces/model-data/IUserData";
import { IUserJoinedRoomEventData } from "./../core/interfaces/event-data/IUserJoinedRoomEventData";
import { IUserLeftRoomEventData } from "./../core/interfaces/event-data/IUserLeftRoomEventData";
import { IMessage } from "../models/message/IMessage";
import { IUser } from "../models/user/IUser";
import { IRoom } from "../models/room/IRoom";
import { IUserStatusUpdateEventData } from "../core/interfaces/event-data/UserUpdateEventData";
import { INewMessageEventData } from "../core/interfaces/event-data/INewMessageEventData";
import { IJoinedRoomEventData } from "../core/interfaces/event-data/IJoinedRoomEventData";
import { IAuthenticatedEventData } from "../core/interfaces/event-data/IAuthenticatedEventData";
import { UpdateStatusActionDto } from "../core/dtos/UpdateStatusActionDto";
import { SendMessageActionDto } from "../core/dtos/SendMessageActionDto";
import { JoinRoomActionDto } from "../core/dtos/JoinRoomActionDto";
import { AuthenticateActionDto } from "../core/dtos/AuthenticateActionDto";
import { IErrorEventData } from "../core/interfaces/event-data/IErrorEventData";
import { plainToClass } from "class-transformer";
import { Server, Socket } from "socket.io";
import { PixlyProtocol } from "../core/protocol";
import { validateSync, ValidationError } from "class-validator";
import PixlyInputError from "../errors/PixlyInputError";
import PixlyError from "../errors/PixlyError";
import { deserializeMessage, deserializeRoom, deserializeUser } from "../utils/modelDeserializers";
import { serializeMessage, serializeRoom, serializeUser } from "../utils/modelSerializers";
import { Logger } from "winston";

export class PixlyService {
  private rooms: { [roomName: string]: IRoom } = {};
  private users: { [userSocketId: string]: IUser } = {};

  constructor(private io: Server, private logger: Logger) {
    io.on("connection", this.onConnection);
  }

  private onConnection = (socket: Socket) => {
    this.installActions(socket);

    socket.on("disconnecting", event => this.onDisconnecting(socket));
  };

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
      throw new Error("Unexpected input");
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
      throw new Error("Please authenticate first");
    }

    onAuthenticated(user);
  }

  private onDisconnecting = (socket: Socket) => {
    const user = this.getUserWithSocketId(socket.id);
    if (user && user.room) {
      this.emitUserLeftRoomEvent(socket, user.room, user);
    }
    this.removeUserWithSocketId(socket.id);
  };

  private onWantsToAuthenticate = (socket: Socket, { name, avatar }: AuthenticateActionDto) => {
    const socketId = socket.id;

    let user = this.getUserWithSocketId(socketId);

    if (!user) {
      user = deserializeUser({
        socketId: socket.id,
        name,
        avatar,
      });

      this.storeUserWithSocketId(user, socketId);
      this.emitAuthenticatedEvent(socket, user);
    }

    this.logger.info(`🐵 User with socketId ${socketId} authenticated with name ${user.name}`);
  };

  private onWantsToJoinRoom = (socket: Socket, { name }: JoinRoomActionDto, user: IUser) => {
    if (user.room) {
      const room = user.room;
      user.leaveRoom();

      if (room.isEmpty()) {
        // No one left to emit events to, delete the room
        this.removeRoomWithName(room.name);
      } else {
        // Let everyone know that the user left the room
        this.emitUserLeftRoomEvent(socket, room, user);
      }
    }

    const room = this.getRoomWithName(name);

    if (room.userWithSocketIdIsInRoom(user.socketId)) {
      throw new PixlyError("You are already in the room");
    }

    room.addUser(user);
    user.room = room;
    user.updateStatus(0, 0);

    socket.join(name);

    this.logger.info(`🏡 User with name ${user.name} joined room with name ${name}`);

    // This events is received by the user who wanted to join the room
    this.emitJoinedRoomEvent(socket, room);

    // This event is received by everyone else on the room
    this.emitUserJoinedRoomEvent(socket, room, user);
  };

  private onWantsToSendMessage = (socket: Socket, { text }: SendMessageActionDto, user: IUser) => {
    if (!user.room) {
      throw new PixlyError("You are not part of any room");
    }

    const message = deserializeMessage({
      text,
      user,
    });

    this.logger.info(`💌  ${user.room.name}@${user.name}: ${text}`);

    this.emitNewMessageEvent(socket, user.room, user, message);
  };

  private onWantsToUpdateStatus = (socket: Socket, { x, y }: UpdateStatusActionDto, user: IUser) => {
    if (!user.room) {
      throw new PixlyError("You are not part of any room");
    }

    user.updateStatus(x, y);

    this.logger.info(`📍  ${user.room.name}@${user.name}: X=${x}, Y=${y}`);

    this.emitUserStatusUpdateEvent(socket, user.room, user);
  };

  private onValidationErrors(socket: Socket, [firstValidationError]: ValidationError[]) {
    const pixlyException = new PixlyInputError(firstValidationError.toString());
    this.onError(socket, pixlyException);
  }

  private onError(socket: Socket, error: Error | PixlyInputError) {
    const isProtocolError = error instanceof PixlyInputError;

    const errorMessage = isProtocolError ? error.message : "Server error";

    this.emitErrorEvent(socket, {
      // If its a protocol error, it has a nice message, if its not, don't expose internals.
      message: isProtocolError ? error.message : "Server error",
    });

    if (!isProtocolError) {
      // Throw to make sure we get logs of it
      throw error;
    } else {
      const user = this.getUserWithSocketId(socket.id);

      this.logger.info(user ? `🔥 @${user.name}-> Error: ${errorMessage}` : `🔥 #${socket.id}->  Error: ${errorMessage}`);
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

  private emitUserJoinedRoomEvent(socket: Socket, room: IRoom, user: IUser) {
    const eventData: IUserJoinedRoomEventData = {
      user: serializeUser(user),
    };

    this.emitEventToRoomExceptUser(PixlyProtocol.events.USER_JOINED_ROOM, eventData, socket, room, user);
  }

  private emitUserLeftRoomEvent(socket: Socket, room: IRoom, user: IUser) {
    const eventData: IUserLeftRoomEventData = {
      user: serializeUser(user),
    };

    socket.to(room.name).emit(PixlyProtocol.events.USER_LEFT_ROOM, eventData);
  }

  private emitNewMessageEvent(socket: Socket, room: IRoom, user: IUser, message: IMessage) {
    const eventData: INewMessageEventData = {
      message: serializeMessage(message),
    };

    this.emitEventToRoomExceptUser(PixlyProtocol.events.NEW_MESSAGE, eventData, socket, room, user);
  }

  private emitUserStatusUpdateEvent(socket: Socket, room: IRoom, user: IUser) {
    const eventData: IUserStatusUpdateEventData = {
      user: serializeUser(user),
    };

    this.emitEventToRoomExceptUser(PixlyProtocol.events.USER_STATUS_UPDATE, eventData, socket, room, user);
  }

  private emitEventToRoomExceptUser(event: string, eventData: Record<string, any>, socket: Socket, room: IRoom, user: IUser) {
    // There's no way to emit to everyone in a room but the sender
    Object.entries(room.users).forEach(([userSocketId, roomUser]) => {
      if (user.socketId === roomUser.socketId) return;
      socket.broadcast.to(userSocketId).emit(event, eventData);
    });
  }

  private emitErrorEvent(socket: Socket, eventData: IErrorEventData) {
    socket.emit(PixlyProtocol.events.ERROR, eventData);
  }

  private getRoomWithName(roomName: string): IRoom {
    let room = this.rooms[roomName];
    if (room) return room;

    room = deserializeRoom({
      name: roomName,
      users: {},
    });

    this.storeRoomWithName(room, roomName);

    return room;
  }

  private removeRoomWithName(roomName: string) {
    delete this.rooms[roomName];
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
    const user = this.getUserWithSocketId(socketId);

    if (user && user.room) {
      user.room.removeUserWithSocketId(socketId);
    }

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
