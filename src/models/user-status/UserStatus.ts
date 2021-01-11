import { IUserStatus } from './IUserStatus';

export class UserStatus implements IUserStatus {
  x: number;

  y: number;

  constructor(x: number, y: number) {
    this.update(x, y);
  }

  update(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
