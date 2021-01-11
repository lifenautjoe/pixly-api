import { IRoom } from './../models/room/IRoom';
import { Room } from './../models/room/Room';
import { IUser } from '../models/user/IUser';
import { User } from '../models/user/User';
import { IUserData } from '../../core/interfaces/model-data/IUserData';
import deserializeModel from './deserializeModel';
import { IRoomData } from '../../core/interfaces/model-data/IRoomData';

export function deserializeUser(data: IUserData) {
  return deserializeModel<IUserData, IUser>(data, User);
}

export function deserializeRoom(data: IRoomData) {
  return deserializeModel<IRoomData, IRoom>(data, Room);
}
