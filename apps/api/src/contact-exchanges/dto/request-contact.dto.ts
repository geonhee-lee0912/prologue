import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';

export const CONTACT_TYPES = ['phone', 'kakao'] as const;

export class RequestContactDto {
  @ApiProperty({ enum: CONTACT_TYPES, description: '교환할 연락처 종류' })
  @IsEnum(CONTACT_TYPES)
  contactType!: 'phone' | 'kakao';

  @ApiProperty({ description: '내 연락처 (휴대폰 또는 카카오ID). 최소 3자' })
  @IsString()
  @MinLength(3)
  myContact!: string;
}
