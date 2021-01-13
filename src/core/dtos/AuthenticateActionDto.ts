import { PixlyProtocol } from "./../protocol";
import { IsDefined, IsIn, IsString, Length } from "class-validator";

export class AuthenticateActionDto {
  @IsString()
  @Length(1, 32)
  @IsDefined()
  public name: string;

  @IsString()
  @IsDefined()
  @IsIn(Object.values(PixlyProtocol.avatars))
  public avatar: string;
}
