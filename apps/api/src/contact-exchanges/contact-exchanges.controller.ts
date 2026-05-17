import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { ContactExchangesService } from './contact-exchanges.service';
import { RequestContactDto } from './dto/request-contact.dto';
import { RespondContactDto } from './dto/respond-contact.dto';

/**
 * @fr FR-G05 연락처 교환 요청
 * @fr FR-G06 연락처 교환 동의/거절
 */
@ApiTags('contact-exchanges')
@ApiBearerAuth()
@Controller('v1')
export class ContactExchangesController {
  constructor(private readonly service: ContactExchangesService) {}

  @Post('conversations/:conversationId/contact-exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '연락처 교환 요청',
    description:
      '요청자가 자기 연락처를 같이 보냄. 응답자가 동의해야 양쪽 평문이 시스템 메시지로 공개됨.',
  })
  async request(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string,
    @Body() dto: RequestContactDto,
  ) {
    return this.service.request(user.userId, conversationId, dto);
  }

  @Post('contact-exchanges/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '연락처 교환 응답 (동의/거절)',
    description:
      '응답자만 호출 가능. accepted=true 시 myContact 필수. 거절 시 임시 보관된 평문 폐기.',
  })
  async respond(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: RespondContactDto,
  ) {
    return this.service.respond(user.userId, id, dto);
  }

  @Get('conversations/:conversationId/contact-exchanges')
  @ApiOperation({ summary: '대화방의 연락처 교환 이력 (메타데이터만)' })
  async listForConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string,
  ) {
    return this.service.listForConversation(user.userId, conversationId);
  }
}
