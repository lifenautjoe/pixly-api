import { IUserStatus } from './../models/user-status/IUserStatus';
import { IUserStatusData } from './../../core/interfaces/model-data/IUserStatusData';
import { IMessageData } from './../../core/interfaces/model-data/IMessageData';
import { IMessage } from './../models/message/IMessage';
import { IRoom } from './../models/room/IRoom';
import { IRoomData } from './../../core/interfaces/model-data/IRoomData';
import { IUser } from './../models/user/IUser';
import { IUserData } from './../../core/interfaces/model-data/IUserData';
import serializeModel from './serializeModel';

export function serializeUser(instance: IUser) {
  return serializeModel<IUser, IUserData>(instance);
}

export function serializeRoom(instance: IRoom) {
  return serializeModel<IRoom, IRoomData>(instance);
}

export function serializeMessage(instance: IMessage) {
  return serializeModel<IMessage, IMessageData>(instance);
}

export function serializeUserStatus(instance: IUserStatus) {
  return serializeModel<IUserStatus, IUserStatusData>(instance);
}
