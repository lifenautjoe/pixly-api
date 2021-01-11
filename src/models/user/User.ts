import { IRoom } from "./../room/IRoom";
import { IUserStatus } from "./../user-status/IUserStatus";
import { IUser } from "./IUser";
import { Exclude, Transform } from "class-transformer";
import { UserStatus } from "../user-status/UserStatus";
import { serializeUserStatus } from "../../utils/modelSerializers";

export class User implements IUser {
  socketId: string;

  name: string;

  avatar: string;

  @Transform(status => serializeUserStatus(status))
  status!: IUserStatus;

  @Exclude()
  room?: IRoom;

  updateStatus(x: number, y: number) {
    if (this.status) {
      this.status.update(x, y);
    } else {
      this.status = new UserStatus(x, y);
    }
  }

  leaveRoom() {
    if (!this.room) return;

    this.room.removeUserWithSocketId(this.socketId);
    this.room = null;
  }
}
