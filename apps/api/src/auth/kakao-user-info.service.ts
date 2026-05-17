import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@prologue/shared';
import { createHash } from 'node:crypto';
import { AppException } from '../common/exceptions/app.exception';

export interface KakaoUserInfo {
  /** 카카오 user id (숫자 ID 문자열). User.kakaoId 에 저장 */
  kakaoId: string;
  email?: string;
  nickname?: string;
}

/**
 * 카카오 access_token 으로 사용자 정보를 조회한다.
 *
 * - mock: 토큰 해시 기반 결정적 kakaoId 생성 (개발/테스트용).
 *   동일 access_token → 동일 kakaoId 라 시나리오 검증에 편리.
 * - real: kakao API `GET /v2/user/me` 호출.
 *
 * env: KAKAO_USER_INFO_PROVIDER=mock|real (기본 mock)
 */
@Injectable()
export class KakaoUserInfoService {
  private readonly logger = new Logger(KakaoUserInfoService.name);
  private readonly mode: 'mock' | 'real';

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('KAKAO_USER_INFO_PROVIDER') ?? 'mock';
    this.mode = raw === 'real' ? 'real' : 'mock';
    this.logger.log(`mode=${this.mode}`);
  }

  async getUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    if (this.mode === 'mock') {
      return this.mockGetUserInfo(accessToken);
    }
    return this.realGetUserInfo(accessToken);
  }

  private mockGetUserInfo(accessToken: string): KakaoUserInfo {
    const hash = createHash('sha256').update(`mock-kakao:${accessToken}`).digest('hex').slice(0, 16);
    return {
      kakaoId: `mock_${hash}`,
      nickname: 'MockKakaoUser',
    };
  }

  private async realGetUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    let res: Response;
    try {
      res = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      this.logger.error(`kakao API 호출 실패: ${(err as Error).message}`);
      throw new AppException(
        ErrorCode.KAKAO_AUTH_FAILED,
        '카카오 인증 서버에 연결할 수 없습니다.',
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (!res.ok) {
      throw new AppException(
        ErrorCode.KAKAO_AUTH_FAILED,
        '카카오 access token 이 유효하지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const data = (await res.json()) as {
      id: number;
      kakao_account?: { email?: string; profile?: { nickname?: string } };
    };
    return {
      kakaoId: String(data.id),
      email: data.kakao_account?.email,
      nickname: data.kakao_account?.profile?.nickname,
    };
  }
}
