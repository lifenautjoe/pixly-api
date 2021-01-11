import { IUser } from './../user/IUser';

export interface IRoom {
  name: string;

  users?: { [userSocketId: string]: IUser };

  addUser(user: IUser): void;

  removeUserWithSocketId(socketId: string): void;

  getUserWithSocketId(socketId: string): IUser | undefined;

  userWithSocketIdIsInRoom(socketId: string): boolean;
}
