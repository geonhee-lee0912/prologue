import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ConsentItemDto {
  @ApiProperty({ description: '약관 종류', example: 'terms_of_service' })
  @IsString()
  type!: string;

  @ApiProperty({ description: '필수 여부' })
  @IsBoolean()
  required!: boolean;

  @ApiProperty({ description: '동의 여부' })
  @IsBoolean()
  agreed!: boolean;

  @ApiProperty({ description: '약관 버전', example: '2026-05' })
  @IsString()
  version!: string;
}

export class CompleteIdentityDto {
  @ApiProperty({ description: 'startIdentity 응답에서 받은 sessionId' })
  @IsString()
  sessionId!: string;

  @ApiProperty({
    description:
      'PASS 콜백 토큰. mock 모드에서는 JSON 직렬화된 사용자 입력 ' +
      '(예: \'{"phoneNumber":"+821012345678","name":"홍길동","birthYear":1992,"gender":"male"}\').',
  })
  @IsString()
  callbackToken!: string;

  @ApiProperty({
    description: '약관 동의 항목 (신규 가입 시 필수).',
    type: [ConsentItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentItemDto)
  consents?: ConsentItemDto[];
}
