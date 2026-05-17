import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { PhotosService } from './photos.service';

/**
 * @fr FR-C01 사진 등록
 *
 * 사진 업로드/조회/삭제/대표 지정.
 * 얼굴 매칭 (FR-B02) 은 별도 — 현재는 사진만 저장하고 faceMatchStatus 는 not_submitted 유지.
 */
@ApiTags('photos')
@ApiBearerAuth()
@Controller('v1/me/photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Get()
  @ApiOperation({ summary: '내 사진 목록 (signed URL 포함, 1시간 유효)' })
  async list(@CurrentUser() user: CurrentUserData) {
    return this.photosService.listMyPhotos(user.userId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({
    summary: '사진 업로드 (multipart/form-data)',
    description:
      'multipart 필드 `file` 에 사진을 첨부. JPEG/PNG/WEBP 만 허용. 최대 5MB, 사용자당 최대 6장. ' +
      '첫 사진이면 자동으로 대표 사진(isMain=true)으로 설정.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        photoType: { type: 'string', enum: ['main', 'daily', 'hobby'] },
      },
    },
  })
  async upload(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadPhotoDto,
  ) {
    return this.photosService.uploadPhoto(user.userId, file, dto.photoType);
  }

  @Delete(':photoId')
  @ApiOperation({ summary: '사진 삭제 (soft delete + Storage 파일 제거)' })
  async delete(@CurrentUser() user: CurrentUserData, @Param('photoId') photoId: string) {
    return this.photosService.deletePhoto(user.userId, photoId);
  }

  @Patch(':photoId/main')
  @ApiOperation({ summary: '대표 사진 변경 — 기존 대표는 자동 해제' })
  async setMain(@CurrentUser() user: CurrentUserData, @Param('photoId') photoId: string) {
    return this.photosService.setMain(user.userId, photoId);
  }
}
