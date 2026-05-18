import { ApiProperty } from '@nestjs/swagger';
import {
  CONTACT_FREQUENCY_VALUES,
  MARRIAGE_OPENNESS_VALUES,
  RELATIONSHIP_INTENT_VALUES,
  RELATIONSHIP_PACE_VALUES,
  type ContactFrequencyValue,
  type MarriageOpennessValue,
  type RelationshipIntentValue,
  type RelationshipPaceValue,
} from '@prologue/shared';
import { IsEnum, IsObject, IsOptional } from 'class-validator';

/**
 * @fr FR-B04 관계 목적 설문 입력 DTO.
 *
 * Prisma 의 RelationshipPreference 와 동일한 enum 사용.
 * marriageOpenness 는 schema 의 extra(jsonb) 영역에 저장.
 */
export class RelationshipPreferenceDto {
  @ApiProperty({ enum: RELATIONSHIP_INTENT_VALUES })
  @IsEnum(RELATIONSHIP_INTENT_VALUES)
  intent!: RelationshipIntentValue;

  @ApiProperty({ enum: RELATIONSHIP_PACE_VALUES })
  @IsEnum(RELATIONSHIP_PACE_VALUES)
  pace!: RelationshipPaceValue;

  @ApiProperty({ enum: CONTACT_FREQUENCY_VALUES })
  @IsEnum(CONTACT_FREQUENCY_VALUES)
  contactFrequency!: ContactFrequencyValue;

  @ApiProperty({
    enum: MARRIAGE_OPENNESS_VALUES,
    required: false,
    description: '결혼 가능성 (선택). extra.marriageOpenness 로 저장.',
  })
  @IsOptional()
  @IsEnum(MARRIAGE_OPENNESS_VALUES)
  marriageOpenness?: MarriageOpennessValue;

  @ApiProperty({ required: false, description: '기타 자유 jsonb 영역' })
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}
