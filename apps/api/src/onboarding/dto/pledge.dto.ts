import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * @fr FR-B05 매너 서약
 * @fr FR-B06 싱글 상태 서약
 *
 * 두 서약 모두 동일한 입력 구조: 동의 + 동의한 버전.
 * 버전은 서버에서 검증해서 카피 변경 시 재서약 유도 가능.
 */
export class PledgeDto {
  @ApiProperty({ description: '동의 여부 (true 만 허용)' })
  @IsBoolean()
  agreed!: boolean;

  @ApiProperty({
    required: false,
    description: '동의한 서약 카피 버전 (생략 시 현재 버전으로 간주)',
  })
  @IsOptional()
  @IsString()
  version?: string;
}
