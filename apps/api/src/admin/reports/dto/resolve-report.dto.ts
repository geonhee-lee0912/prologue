import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 신고 처리 액션 (정책서 8장 제재 단계 단순화 MVP):
 * - dismiss: 무근거 신고. 신고 상태 rejected.
 * - resolve_no_action: 검토 결과 무조치. status=resolved.
 * - resolve_warned: 운영자 메모로만 기록. status=resolved.
 * - resolve_suspended: 피신고자 계정 정지 + status=resolved (suspendTarget=true 동시 처리).
 */
export type ResolveReportAction =
  | 'dismiss'
  | 'resolve_no_action'
  | 'resolve_warned'
  | 'resolve_suspended';

const ACTIONS: ResolveReportAction[] = [
  'dismiss',
  'resolve_no_action',
  'resolve_warned',
  'resolve_suspended',
];

export class ResolveReportDto {
  @ApiProperty({ enum: ACTIONS })
  @IsEnum(ACTIONS)
  action!: ResolveReportAction;

  @ApiProperty({
    required: false,
    description: '운영자 메모 (사용자에게 절대 공개 금지). resolutionNote 컬럼에 저장.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiProperty({
    required: false,
    description: 'resolve_suspended 와 별도로 명시적으로 정지 처리할지. 기본 action 기준 자동 결정.',
  })
  @IsOptional()
  @IsBoolean()
  suspendTarget?: boolean;
}
