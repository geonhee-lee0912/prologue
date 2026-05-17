import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

/**
 * @fr FR-C02 기본 정보 입력
 * @fr FR-C03 나의 프롤로그 입력
 * @fr FR-C04 이야기의 목차 입력
 * @fr FR-C05 관계의 문체 입력
 * @fr FR-C06 프로필 미리보기 (GET /me/profile)
 * @fr FR-C07 프로필 완성도 계산
 */
@ApiTags('profile')
@ApiBearerAuth()
@Controller('v1/me/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: '내 프로필 조회 (집계)',
    description:
      'User + Profile + ProfileAnswer[] + RelationshipPreference 를 집계해서 반환. 완성도 점수 포함.',
  })
  async getMyProfile(@CurrentUser() user: CurrentUserData) {
    return this.profileService.getMyProfile(user.userId);
  }

  @Patch()
  @ApiOperation({
    summary: '내 프로필 부분 갱신',
    description:
      'body 의 어떤 필드든 일부만 보내면 해당 부분만 갱신. answers/preference 도 upsert. ' +
      '갱신 후 완성도 자동 재계산.',
  })
  async updateMyProfile(@CurrentUser() user: CurrentUserData, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateMyProfile(user.userId, dto);
  }
}
