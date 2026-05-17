import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class RespondContactDto {
  @ApiProperty({ description: '동의 여부' })
  @IsBoolean()
  accepted!: boolean;

  @ApiProperty({ required: false, description: '동의 시 내 연락처 (필수)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  myContact?: string;
}
