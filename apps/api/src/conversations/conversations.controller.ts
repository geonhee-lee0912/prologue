import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { ConversationsService } from './conversations.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * @fr FR-G 대화방
 */
@ApiTags('conversations')
@ApiBearerAuth()
@Controller('v1')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get('me/conversations')
  @ApiOperation({ summary: '내 대화방 목록 (FR-G01)' })
  async listMy(@CurrentUser() user: CurrentUserData) {
    return this.conversations.listMyConversations(user.userId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: '대화방 상세 + 메시지 (FR-G02)' })
  async get(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.conversations.getConversation(user.userId, id);
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '메시지 전송',
    description:
      '대화방 만료 / 차단 / 종료 검증 후 INSERT. ' +
      '모바일은 메시지 SELECT 는 Supabase Realtime 으로 직접 구독 (CLAUDE.md 패턴 3) 권장.',
  })
  async sendMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversations.sendMessage(user.userId, id, dto.content);
  }
}
