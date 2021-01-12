import { Transform } from "class-transformer";
import { serializeUser } from "../../utils/modelSerializers";
import { IUser } from "./../user/IUser";
import { IMessage } from "./IMessage";

export class Message implements IMessage {
  text: string;

  @Transform(user => serializeUser(user))
  user: IUser;

  constructor(text: string) {
    this.text = text;
  }
}
