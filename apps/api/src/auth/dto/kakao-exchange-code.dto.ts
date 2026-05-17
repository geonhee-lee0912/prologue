import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KakaoExchangeCodeDto {
  @ApiProperty({ description: '카카오 OAuth 콜백으로 받은 authorization code' })
  @IsString()
  code!: string;

  @ApiProperty({
    description: '인증 시 사용한 redirect URI (카카오 콘솔에 등록된 값과 일치해야 함)',
    example: 'prologue://oauth',
  })
  @IsString()
  redirectUri!: string;
}
