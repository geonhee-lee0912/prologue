import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { FaceVerificationService } from './face.service';

/**
 * @fr FR-B02 얼굴 인증
 */
@ApiTags('verification')
@ApiBearerAuth()
@Controller('v1/me/verification')
export class FaceVerificationController {
  constructor(private readonly faceService: FaceVerificationService) {}

  @Get()
  @ApiOperation({ summary: '내 인증 상태 조회 (identity + face)' })
  async getStatus(@CurrentUser() user: CurrentUserData) {
    return this.faceService.getStatus(user.userId);
  }

  @Post('face')
  @UseInterceptors(FileInterceptor('selfie', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({
    summary: '얼굴 인증 — 셀피 업로드 + 대표 사진과 매칭',
    description:
      'multipart 필드 `selfie` 에 셀피 업로드. ' +
      '대표 사진(FR-C01)이 등록되어 있어야 함. ' +
      '성공 시 UserAuth.faceMatchStatus = verified, 대표 Photo.faceMatchStatus = verified. ' +
      '실패 시 rejected (재시도 가능). 이미 verified 인 경우 거부.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        selfie: { type: 'string', format: 'binary' },
      },
    },
  })
  async verifyFace(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
    @Body() _body: Record<string, unknown>,
  ) {
    return this.faceService.verifyFace(user.userId, file);
  }
}
