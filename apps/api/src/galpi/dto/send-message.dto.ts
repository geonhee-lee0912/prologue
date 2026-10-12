import { ApiProperty } from '@nestjs/swagger';
import { POLICY } from '@prologue/shared';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendGalpiMessageDto {
  @ApiProperty({ description: '갈피에게 하는 말. "다른 얘기 할래요"를 누르면 빈 문자열', maxLength: POLICY.galpi.maxUserMessageLength })
  @IsString()
  @MaxLength(POLICY.galpi.maxUserMessageLength)
  text!: string;

  @ApiProperty({ required: false, description: '"다른 얘기 할래요"를 눌렀다 — 턴으로 세지 않는다' })
  @IsOptional()
  @IsBoolean()
  skipped?: boolean;
}
