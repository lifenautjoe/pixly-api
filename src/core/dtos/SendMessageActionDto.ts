import { IsDefined, IsString, Length } from "class-validator";

export class SendMessageActionDto {
  @IsString()
  @IsDefined()
  @Length(1, 124)
  public text: string;
}
