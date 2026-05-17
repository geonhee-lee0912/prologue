import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginKakaoDto {
  @ApiProperty({
    description: '카카오 OAuth 로 모바일이 받은 access token.',
    example: 'AAAA-bbbb-CCCC',
  })
  @IsString()
  kakaoAccessToken!: string;
}
