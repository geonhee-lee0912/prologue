import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const REPORT_TYPES = [
  'rude_message',
  'sexual_content',
  'harassment',
  'fake_information',
  'in_relationship',
  'scam_or_money_request',
  'external_contact_pressure',
  'other',
] as const;

export type ReportTypeEnum = (typeof REPORT_TYPES)[number];

export class CreateReportDto {
  @ApiProperty({ description: '신고 대상 사용자 ID' })
  @IsUUID()
  targetUserId!: string;

  @ApiProperty({ enum: REPORT_TYPES, description: '신고 사유' })
  @IsEnum(REPORT_TYPES)
  reportType!: ReportTypeEnum;

  @ApiPropertyOptional({ description: '상세 설명 (운영자 전용, 사용자 공개 금지)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: '관련 대화방 ID' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({ description: '관련 메시지 ID' })
  @IsOptional()
  @IsString()
  messageId?: string;
}
