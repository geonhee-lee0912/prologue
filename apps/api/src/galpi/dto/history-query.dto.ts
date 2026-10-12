import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GalpiHistoryQueryDto {
  @ApiProperty({ required: false, description: '이 메시지보다 앞의 기록을 본다' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  before?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
