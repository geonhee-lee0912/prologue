import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { GalpiMemoryDto, GalpiReportDto, GalpiTurnResultDto } from '@prologue/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { GalpiAccessService } from './access.service';
import { ConversationService } from './conversation.service';
import { AnswerQuickReplyDto } from './dto/answer-quick-reply.dto';
import { GalpiHistoryQueryDto } from './dto/history-query.dto';
import { SendGalpiMessageDto } from './dto/send-message.dto';
import { QuickReplyService } from './quick-reply.service';
import { ReportService } from './report/report.service';
import { WikiService } from './wiki/wiki.service';

/**
 * 갈피 — 대화, 갈피가 기억하는 것, 제가 읽은 당신
 * 화면: 갈피 대화방(B1~B4·C2), 갈피가 기억하는 것(IA 7장), 내 이야기 탭 리포트(C3)
 * 출입: 대화는 본인인증 + 민감정보·국외이전 동의, 열람·빼기·리포트는 본인인증만 (access.service.ts)
 */
@ApiTags('galpi')
@ApiBearerAuth()
@Controller('v1/galpi')
export class GalpiController {
  constructor(
    private readonly conversation: ConversationService,
    private readonly quickReply: QuickReplyService,
    private readonly access: GalpiAccessService,
    private readonly wiki: WikiService,
    private readonly report: ReportService,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '갈피 첫 만남 — 처음 한 번만 고정 대사, 다시 부르면 기록을 돌려준다' })
  start(@CurrentUser() user: CurrentUserData): Promise<GalpiTurnResultDto> {
    return this.conversation.start(user.userId);
  }

  @Get('messages')
  @ApiOperation({ summary: '갈피 대화 기록 — before 로 앞쪽을 이어서 본다' })
  history(@CurrentUser() user: CurrentUserData, @Query() query: GalpiHistoryQueryDto): Promise<GalpiTurnResultDto> {
    return this.conversation.history(user.userId, { before: query.before, limit: query.limit });
  }

  @Post('messages')
  @HttpCode(HttpStatus.OK)
  // 말 한 번에 LLM 을 부른다 — 전역(분당 60)보다 좁게
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: '갈피에게 말하기 — [내 말, ...갈피 말]을 돌려준다' })
  send(@CurrentUser() user: CurrentUserData, @Body() dto: SendGalpiMessageDto): Promise<GalpiTurnResultDto> {
    return this.conversation.send(user.userId, { text: dto.text, skipped: dto.skipped });
  }

  @Post('messages/:id/answer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '갈피가 건넨 버튼에 답하기 — 버튼 하나에 한 번만' })
  answer(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: AnswerQuickReplyDto): Promise<GalpiTurnResultDto> {
    return this.quickReply.answer(user.userId, id, dto.key);
  }

  @Get('memories')
  @ApiOperation({ summary: '갈피가 기억하는 것 — 서고의 보이는 장만' })
  async memories(@CurrentUser() user: CurrentUserData): Promise<GalpiMemoryDto[]> {
    await this.access.assertVerified(user.userId);
    return this.wiki.listVisible(user.userId);
  }

  @Delete('memories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '갈피 빼기 — 문장과 그 출처 원문까지 지운다' })
  async removeMemory(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<void> {
    await this.access.assertVerified(user.userId);
    await this.wiki.removeClaim(user.userId, id);
  }

  @Get('report')
  @ApiOperation({ summary: '제가 읽은 당신 — 최근 리포트, 없으면 null' })
  async latestReport(@CurrentUser() user: CurrentUserData): Promise<GalpiReportDto | null> {
    await this.access.assertVerified(user.userId);
    return this.report.latest(user.userId);
  }
}
