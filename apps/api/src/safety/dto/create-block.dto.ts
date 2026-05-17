import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateBlockDto {
  @ApiProperty({ description: '차단할 사용자 ID' })
  @IsUUID()
  blockedId!: string;
}
