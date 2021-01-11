import { IUserData } from './../../../core/interfaces/model-data/IUserData';
import { IRoom } from './IRoom';
import { IUser } from '../user/IUser';
import { Transform } from 'class-transformer';
import { serializeUser } from '../../utils/modelSerializers';

export class Room implements IRoom {
  public name: string;

  @Transform(
    users => {
      const results: { [userSocketId: string]: IUserData } = {};

      users.forEach((user: IUser) => {
        results[users.socketId] = serializeUser(user);
      });

      return results;
    },
    { toPlainOnly: true },
  )
  public users?: { [userSocketId: string]: IUser };

  constructor(name: string) {
    this.name = name;
  }

  addUser(user: IUser) {
    if (!this.users) {
      this.users = {};
    }

    this.users[user.socketId] = user;
  }

  removeUserWithSocketId(socketId: string) {
    delete this.users[socketId];
  }

  getUserWithSocketId(socketId: string): IUser | undefined {
    return this.users[socketId];
  }

  userWithSocketIdIsInRoom(socketId: string): boolean {
    return !!this.getUserWithSocketId(socketId);
  }
}
