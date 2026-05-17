import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { RecommendationsService } from './recommendations.service';

/**
 * @fr FR-D01 추천 후보 생성 (룰 기반)
 * @fr FR-D02 추천 카드
 * @fr FR-D04 매칭 리포트 요약
 */
@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('v1')
export class RecommendationsController {
  constructor(private readonly recService: RecommendationsService) {}

  @Get('me/recommendations')
  @ApiOperation({
    summary: '오늘의 추천 목록 (Asia/Seoul)',
    description:
      '기존 추천이 dailyLimit 미만이면 즉시 부족분 생성 (온디맨드). ' +
      '점수 숫자는 응답에 포함되지 않음. 추천 이유 텍스트만.',
  })
  async listMyRecommendations(@CurrentUser() user: CurrentUserData) {
    return this.recService.listMyRecommendations(user.userId);
  }

  @Get('recommendations/:id')
  @ApiOperation({ summary: '추천 카드 상세 (target 프로필 + 추천 이유)' })
  async getOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.recService.getRecommendation(user.userId, id);
  }

  @Post('recommendations/:id/shown')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '카드를 본 것으로 표시 (status: created → shown)' })
  async markShown(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.recService.markShown(user.userId, id);
  }
}
