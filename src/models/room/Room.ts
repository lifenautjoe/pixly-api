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
      // We lazy load this property to avoid having an empty array when this model is in the frontend
      // indicating that there are no users in the room
      this.users = {};
    }

    if (this.userWithNameIsInRoom(user.name)) {
      throw new Error('User with this username is already in the room');
    }

    if (this.userWithSocketIdIsInRoom(user.socketId)) {
      throw new Error('User with this socket id is already in the room');
    }

    this.users[user.socketId] = user;
  }

  removeUserWithSocketId(socketId: string) {
    delete this.users[socketId];
  }

  getUserWithName(userName: string): IUser | undefined {
    const upperCaseUsername = userName.toUpperCase();
    return Object.values(this.users).find(user => user.name.toUpperCase() === upperCaseUsername);
  }

  userWithNameIsInRoom(username: string): boolean {
    return !!this.getUserWithName(username);
  }

  getUserWithSocketId(socketId: string): IUser | undefined {
    return this.users[socketId];
  }

  userWithSocketIdIsInRoom(socketId: string): boolean {
    return !!this.getUserWithSocketId(socketId);
  }
}
