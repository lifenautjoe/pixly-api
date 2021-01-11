import { IUser } from './IUser';
export interface IRoom {
  name: string;

  users?: { [userSocketId: string]: IUser };

  addUser(user: IUser): void;

  removeUserWithSocketId(socketId: string): void;

  getUserWithName(userName: string): IUser | undefined;

  userWithNameIsInRoom(username: string): boolean;

  getUserWithSocketId(socketId: string): IUser | undefined;

  userWithSocketIdIsInRoom(socketId: string): boolean;
}
