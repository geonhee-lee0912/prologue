import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export const SKIP_REASONS = [
  'appearance_low_match',
  'intent_mismatch',
  'distance_mismatch',
  'conversation_style_mismatch',
  'job_lifestyle_mismatch',
  'values_mismatch',
  'insufficient_profile',
  'other',
] as const;

export type SkipReason = (typeof SKIP_REASONS)[number];

export class SkipDto {
  @ApiProperty({
    required: false,
    enum: SKIP_REASONS,
    description: '거절 사유 (선택). 자기 자신도 응답에서 노출되지 않음.',
  })
  @IsOptional()
  @IsEnum(SKIP_REASONS)
  skipReason?: SkipReason;

  @ApiProperty({ required: false, description: '자유 메모 (운영자만 조회 가능)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  skipReasonNote?: string;
}
