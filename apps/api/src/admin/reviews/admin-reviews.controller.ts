import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../auth/admin-auth.guard';
import type { CurrentAdminData } from '../auth/admin-payload.types';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminReviewsService } from './admin-reviews.service';
import { ReviewDecisionDto } from './dto/review-decision.dto';

/**
 * @fr FR-K01 인증 검수 (08_화면목록_IA K03)
 */
@ApiTags('admin/reviews')
@ApiBearerAuth()
@Public()
@UseGuards(AdminJwtAuthGuard)
@Controller('v1/admin/reviews')
export class AdminReviewsController {
  constructor(private readonly service: AdminReviewsService) {}

  @Get('photos/pending')
  @ApiOperation({ summary: '검수 대기 사진 목록 (signed url 포함)' })
  listPendingPhotos() {
    return this.service.listPendingPhotos();
  }

  @Post('photos/:id/decision')
  @ApiOperation({ summary: '사진 검수 결정 (approve/reject)' })
  decidePhoto(
    @Param('id') id: string,
    @Body() dto: ReviewDecisionDto,
    @CurrentAdmin() admin: CurrentAdminData,
    @Req() req: Request,
  ) {
    return this.service.decidePhoto(id, dto, admin, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('employment/pending')
  @ApiOperation({ summary: '검수 대기 직업/재직 인증 신청 목록' })
  listPendingEmployment() {
    return this.service.listPendingEmployment();
  }

  @Post('employment/:userId/decision')
  @ApiOperation({ summary: '직업/재직 인증 결정 (approve/reject)' })
  decideEmployment(
    @Param('userId') userId: string,
    @Body() dto: ReviewDecisionDto,
    @CurrentAdmin() admin: CurrentAdminData,
    @Req() req: Request,
  ) {
    return this.service.decideEmployment(userId, dto, admin, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
