import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class AnswerQuickReplyDto {
  @ApiProperty({ description: '고른 선택지의 key (예: allow, deny, no, casual)' })
  @IsString()
  @MaxLength(32)
  key!: string;
}
