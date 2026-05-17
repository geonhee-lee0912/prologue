import { ApiProperty } from '@nestjs/swagger';
import { POLICY } from '@prologue/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const STORY_KEYS = ['work_career', 'weekend_rest', 'friends_family', 'taste_interests'] as const;
const RELATIONSHIP_KEYS = [
  'contact_frequency',
  'conversation_style',
  'relationship_pace',
  'conflict_resolution',
  'affection_expression',
] as const;

export class AnswerItemDto {
  @ApiProperty({ enum: ['story', 'relationship'] })
  @IsEnum(['story', 'relationship'])
  category!: 'story' | 'relationship';

  @ApiProperty({
    description: '문항 키. story: ' + STORY_KEYS.join('|') + ' / relationship: ' + RELATIONSHIP_KEYS.join('|'),
  })
  @IsString()
  @IsIn([...STORY_KEYS, ...RELATIONSHIP_KEYS])
  questionKey!: string;

  @ApiProperty({ description: '자유 답변 (최대 500자)', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  answer!: string;
}

export class PreferenceItemDto {
  @ApiProperty({
    enum: [
      'serious_long_term',
      'natural_dating',
      'open_to_marriage',
      'casual_meeting',
      'friendship_first',
    ],
  })
  @IsEnum([
    'serious_long_term',
    'natural_dating',
    'open_to_marriage',
    'casual_meeting',
    'friendship_first',
  ])
  intent!:
    | 'serious_long_term'
    | 'natural_dating'
    | 'open_to_marriage'
    | 'casual_meeting'
    | 'friendship_first';

  @ApiProperty({ enum: ['slow', 'moderate', 'fast'] })
  @IsEnum(['slow', 'moderate', 'fast'])
  pace!: 'slow' | 'moderate' | 'fast';

  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  @IsEnum(['low', 'medium', 'high'])
  contactFrequency!: 'low' | 'medium' | 'high';

  @ApiProperty({ required: false, description: '추가 항목 (jsonb 자유 영역)' })
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

/**
 * 프로필 부분 갱신 — 모든 필드 optional, 보낸 것만 반영.
 *
 * FR-C 모든 항목을 한 엔드포인트에서 처리 (mobile 이 단계별로 PATCH).
 */
export class UpdateProfileDto {
  // --- User 필드 (FR-C02 기본 정보) ---
  @ApiProperty({ required: false, description: '시/도 (예: 서울특별시)' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  region1?: string;

  @ApiProperty({ required: false, description: '시/군/구' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  region2?: string;

  @ApiProperty({ required: false, enum: ['male', 'female'] })
  @IsOptional()
  @IsEnum(['male', 'female'])
  targetGender?: 'male' | 'female';

  // --- Profile 필드 ---
  @ApiProperty({ required: false, description: '직업군 (회사명 X)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  jobCategory?: string;

  @ApiProperty({
    required: false,
    description: `나의 프롤로그 (자기소개). ${POLICY.profile.minIntroLength}~${POLICY.profile.maxIntroLength}자.`,
  })
  @IsOptional()
  @IsString()
  @Length(POLICY.profile.minIntroLength, POLICY.profile.maxIntroLength)
  intro?: string;

  @ApiProperty({
    required: false,
    description: `라이프스타일 태그 (최대 ${POLICY.profile.maxLifestyleTags}개)`,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(POLICY.profile.maxLifestyleTags)
  @IsString({ each: true })
  lifestyleTags?: string[];

  // --- 문답 (FR-C04, FR-C05) ---
  @ApiProperty({ required: false, type: [AnswerItemDto], description: '이야기/관계 문답 (upsert)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers?: AnswerItemDto[];

  // --- 관계 선호 (FR-C05) ---
  @ApiProperty({ required: false, type: PreferenceItemDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferenceItemDto)
  preference?: PreferenceItemDto;
}
