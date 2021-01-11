import { IMessage } from './IMessage';

export class Message implements IMessage {
  text: string;

  constructor(text: string) {
    this.text = text;
  }
}
