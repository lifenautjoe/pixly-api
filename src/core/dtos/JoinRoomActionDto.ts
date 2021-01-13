import { IsDefined, IsString, Length } from "class-validator";

export class JoinRoomActionDto {
  @IsString()
  @Length(1, 32)
  @IsDefined()
  public name: string;
}
