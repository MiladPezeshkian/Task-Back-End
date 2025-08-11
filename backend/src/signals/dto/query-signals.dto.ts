import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

function toInt(value: any) {
  if (value === undefined || value === null || value === '') return undefined;
  const v = parseInt(value, 10);
  return Number.isNaN(v) ? undefined : v;
}

export class QuerySignalsDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(0)
  from?: number;

  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(0)
  to?: number;

  @IsOptional()
  @Transform(({ value }) => toInt(value) ?? 1)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => toInt(value) ?? 20)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
