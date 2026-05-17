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

  /**
   * 카카오 OAuth authorization code 를 access_token 으로 교환한다.
   * 모바일이 카카오 로그인 페이지에서 code 만 받고 백엔드로 전달했을 때 사용.
   *
   * - mock: 임의 access_token 반환 (개발 편의)
   * - real: POST https://kauth.kakao.com/oauth/token
   *   - grant_type=authorization_code
   *   - client_id=KAKAO_REST_API_KEY
   *   - redirect_uri=<프론트가 사용한 값과 동일해야 함>
   *   - code=<authorization code>
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    if (this.mode === 'mock') {
      return `mock_kakao_${code}`;
    }

    const restApiKey = this.config.get<string>('KAKAO_REST_API_KEY');
    if (!restApiKey) {
      throw new AppException(
        ErrorCode.KAKAO_AUTH_FAILED,
        'KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: restApiKey,
      redirect_uri: redirectUri,
      code,
    });

    let res: Response;
    try {
      res = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: body.toString(),
      });
    } catch (err) {
      this.logger.error(`kakao token 교환 실패: ${(err as Error).message}`);
      throw new AppException(
        ErrorCode.KAKAO_AUTH_FAILED,
        '카카오 인증 서버에 연결할 수 없습니다.',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const data = (await res.json().catch(() => null)) as
      | { access_token?: string; error?: string; error_description?: string }
      | null;

    if (!res.ok || !data?.access_token) {
      this.logger.warn(`kakao token 교환 실패: ${data?.error_description ?? res.status}`);
      throw new AppException(
        ErrorCode.KAKAO_AUTH_FAILED,
        '카카오 인증 코드가 유효하지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return data.access_token;
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
