import { IRoomData } from "./IRoomData";
import { IUserStatusData } from "./IUserStatusData";

export interface IUserData {
  name: string;

  avatar: string;

  socketId: string;

  status?: IUserStatusData;

  room?: IRoomData;
}
