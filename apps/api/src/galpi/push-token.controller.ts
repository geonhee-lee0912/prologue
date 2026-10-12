import { Body, Controller, Delete, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { PushTokenDto } from './dto/push-token.dto';
import { PushTokenService } from './push-token.service';

@ApiTags('push')
@ApiBearerAuth()
@Controller('v1/me')
export class PushTokenController {
  constructor(private readonly pushTokens: PushTokenService) {}

  @Put('push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '푸시 토큰 등록 — 사용자당 마지막 기기 하나' })
  async register(@CurrentUser() user: CurrentUserData, @Body() dto: PushTokenDto): Promise<void> {
    await this.pushTokens.register(user.userId, dto.token);
  }

  @Delete('push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '푸시 토큰 지우기 (로그아웃)' })
  async remove(@CurrentUser() user: CurrentUserData): Promise<void> {
    await this.pushTokens.remove(user.userId);
  }
}
