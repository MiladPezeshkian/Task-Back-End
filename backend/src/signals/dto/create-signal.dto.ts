import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateSignalDto {
  @IsString()
  deviceId: string;

  @IsOptional()
  @IsInt()
  time?: number;

  @IsOptional()
  dataLength?: number;

  @IsOptional()
  raw?: any;
}
