import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: '메시지 본문 (1~2000자)' })
  @IsString()
  @Length(1, 2000)
  content!: string;
}
