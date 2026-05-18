import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewDecisionDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @ApiProperty({ required: false, description: '반려 사유 또는 메모. 운영자 내부용.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
