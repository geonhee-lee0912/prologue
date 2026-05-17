import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ description: 'E.164 형식 휴대폰 번호', example: '+821012345678' })
  @IsString()
  @Matches(/^\+\d{8,15}$/)
  phoneNumber!: string;

  @ApiProperty({ description: '6자리 OTP 코드', example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'OTP 코드는 6자리여야 합니다.' })
  code!: string;
}
