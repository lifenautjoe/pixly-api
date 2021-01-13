import { IUserData } from "./IUserData";

export interface IRoomData {
  name: string;

  users: { [userSocketId: string]: IUserData };
}
