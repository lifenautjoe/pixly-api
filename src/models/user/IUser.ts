import { IRoom } from "./../room/IRoom";

import { IUserStatus } from "../user-status/IUserStatus";
export interface IUser {
  socketId: string;

  name: string;

  avatar: string;

  status: IUserStatus;

  room?: IRoom;

  updateStatus(x: number, y: number): void;

  leaveRoom(): void;
}
