import { IsDefined, IsNumber } from "class-validator";

export class UpdateStatusActionDto {
  @IsNumber()
  @IsDefined()
  public x: number;
  @IsNumber()
  @IsDefined()
  public y: number;
}
