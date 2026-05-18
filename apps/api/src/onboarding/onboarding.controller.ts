import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { PledgeDto } from './dto/pledge.dto';
import { RelationshipPreferenceDto } from './dto/relationship-preference.dto';
import { OnboardingService } from './onboarding.service';

/**
 * @fr FR-B03 나이 확인 (조회만)
 * @fr FR-B04 관계 목적 설문
 * @fr FR-B05 매너 서약
 * @fr FR-B06 싱글 상태 서약
 */
@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('v1/me')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('onboarding-status')
  @ApiOperation({
    summary: '온보딩 진행 상태 조회',
    description:
      '본인/얼굴/나이/관계설문/매너서약/싱글서약/프로필/대표사진 상태와 다음 단계(nextStep)를 반환.',
  })
  getStatus(@CurrentUser() user: CurrentUserData) {
    return this.service.getStatus(user.userId);
  }

  @Post('relationship-preference')
  @ApiOperation({
    summary: 'FR-B04 관계 목적 설문 저장',
    description:
      'intent/pace/contactFrequency 필수. marriageOpenness 는 선택(extra.marriageOpenness 로 저장).',
  })
  saveRelationshipPreference(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: RelationshipPreferenceDto,
  ) {
    return this.service.saveRelationshipPreference(user.userId, dto);
  }

  @Post('manner-pledge')
  @ApiOperation({ summary: 'FR-B05 매너 서약 동의' })
  agreeMannerPledge(@CurrentUser() user: CurrentUserData, @Body() dto: PledgeDto) {
    return this.service.agreeMannerPledge(user.userId, dto);
  }

  @Post('single-pledge')
  @ApiOperation({ summary: 'FR-B06 싱글 상태 서약 동의' })
  agreeSinglePledge(@CurrentUser() user: CurrentUserData, @Body() dto: PledgeDto) {
    return this.service.agreeSinglePledge(user.userId, dto);
  }
}
