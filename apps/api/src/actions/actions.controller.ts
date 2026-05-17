import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { ActionsService } from './actions.service';
import { SkipDto } from './dto/skip.dto';

/**
 * @fr FR-E 관심 / 넘기기 / 거절 사유
 * @fr FR-F 매칭 (관심 양방향 자동 감지)
 */
@ApiTags('actions')
@ApiBearerAuth()
@Controller('v1')
export class ActionsController {
  constructor(private readonly actions: ActionsService) {}

  @Post('recommendations/:id/interest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '관심 보내기',
    description:
      '추천에 대해 관심을 표현. 상대도 나에게 관심을 보냈다면 자동으로 Match 생성. ' +
      '응답에서 isMutualMatch=true 면 matchId 포함.',
  })
  async sendInterest(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.actions.sendInterest(user.userId, id);
  }

  @Post('recommendations/:id/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '추천 넘기기 (거절)',
    description: 'skipReason 은 선택. 자기 자신도 이후 조회 불가 (운영 데이터로만 사용).',
  })
  async skip(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: SkipDto,
  ) {
    return this.actions.skip(user.userId, id, dto);
  }

  @Get('me/interests/sent')
  @ApiOperation({ summary: '내가 보낸 관심 목록 (받은 관심은 MVP 후순위)' })
  async listSent(@CurrentUser() user: CurrentUserData) {
    return this.actions.listSentInterests(user.userId);
  }
}
