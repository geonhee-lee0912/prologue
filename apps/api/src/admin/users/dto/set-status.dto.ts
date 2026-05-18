import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetUserStatusDto {
  @ApiProperty({ enum: ['active', 'suspended'] })
  @IsEnum(['active', 'suspended'])
  status!: 'active' | 'suspended';

  @ApiProperty({ required: false, description: '운영자 메모 (감사 로그에만 기록)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
