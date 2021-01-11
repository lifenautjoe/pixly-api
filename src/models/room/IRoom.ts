import { IUser } from "./../user/IUser";

export interface IRoom {
  name: string;

  users?: { [userSocketId: string]: IUser };

  countUsers(): number;

  isEmpty(): boolean;

  addUser(user: IUser): void;

  removeUserWithSocketId(socketId: string): void;

  getUserWithSocketId(socketId: string): IUser | undefined;

  userWithSocketIdIsInRoom(socketId: string): boolean;
}
