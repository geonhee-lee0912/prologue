import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    description: 'E.164 형식 휴대폰 번호 (예: +821012345678)',
    example: '+821012345678',
  })
  @IsString()
  @Matches(/^\+\d{8,15}$/, { message: '휴대폰 번호는 E.164 형식이어야 합니다 (예: +821012345678).' })
  phoneNumber!: string;
}
