import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class UploadPhotoDto {
  @ApiProperty({
    description: '사진 유형. 미지정 시 daily',
    enum: ['main', 'daily', 'hobby'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['main', 'daily', 'hobby'])
  photoType?: 'main' | 'daily' | 'hobby';
}
