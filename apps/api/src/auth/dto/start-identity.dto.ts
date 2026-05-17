import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class StartIdentityDto {
  @ApiProperty({
    description: '카카오 OAuth 로 진입한 사용자의 access token (휴대폰 가입은 비워둠).',
    required: false,
  })
  @IsOptional()
  @IsString()
  kakaoAccessToken?: string;
}
