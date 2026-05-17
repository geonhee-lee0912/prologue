import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { CreateBlockDto } from './dto/create-block.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { SafetyService } from './safety.service';

/**
 * @fr FR-H01 신고
 * @fr FR-H02 차단
 */
@ApiTags('safety')
@ApiBearerAuth()
@Controller('v1')
export class SafetyController {
  constructor(private readonly service: SafetyService) {}

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '신고 접수',
    description:
      '대상 사용자/대화방/메시지에 대한 신고. description 은 운영자 전용, 사용자에게 절대 공개되지 않음.',
  })
  async createReport(@CurrentUser() user: CurrentUserData, @Body() dto: CreateReportDto) {
    return this.service.createReport(user.userId, dto);
  }

  @Post('blocks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '사용자 차단',
    description: '차단 시 진행 중 대화방/매치가 종료되고, 양방향으로 추천 후보에서 제외됨.',
  })
  async createBlock(@CurrentUser() user: CurrentUserData, @Body() dto: CreateBlockDto) {
    return this.service.createBlock(user.userId, dto);
  }
}
