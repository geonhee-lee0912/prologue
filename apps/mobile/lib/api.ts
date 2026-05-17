/**
 * 백엔드 API 클라이언트 (얇은 fetch 래퍼).
 *
 * 응답 규약:
 *  성공: { data: T }
 *  실패: { error: { code, message, details? } }  → ApiError 로 throw
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  identityVerified: boolean;
  nextStep: 'B02_FACE_VERIFICATION' | 'D01_HOME';
}

export interface ConsentItem {
  type: string;
  required: boolean;
  agreed: boolean;
  version: string;
}

export interface IdentityInput {
  phoneNumber: string;
  name: string;
  birthYear: number;
  gender: 'male' | 'female';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code: string; message: string } }
    | null;

  if (!res.ok) {
    const code = body?.error?.code ?? 'UNKNOWN';
    const message = body?.error?.message ?? `HTTP ${res.status}`;
    throw new ApiError(code, message, res.status);
  }
  return body?.data as T;
}

export const api = {
  identityStart(kakaoAccessToken?: string) {
    return request<{ sessionId: string; redirectUrl: string }>('/auth/identity/start', {
      method: 'POST',
      body: JSON.stringify({ kakaoAccessToken }),
    });
  },
  identityComplete(sessionId: string, input: IdentityInput, consents: ConsentItem[]) {
    return request<AuthResponse>('/auth/identity/complete', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        callbackToken: JSON.stringify(input),
        consents,
      }),
    });
  },
  loginOtpSend(phoneNumber: string) {
    return request<{ sentAt: string }>('/auth/login/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  },
  loginOtpVerify(phoneNumber: string, code: string) {
    return request<AuthResponse>('/auth/login/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    });
  },
  loginKakao(kakaoAccessToken: string) {
    return request<AuthResponse>('/auth/login/kakao', {
      method: 'POST',
      body: JSON.stringify({ kakaoAccessToken }),
    });
  },
  logout(accessToken: string) {
    return request<{ revokedCount: number }>('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  me(accessToken: string) {
    return request<{ userId: string; email?: string; phone?: string; role: string }>('/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
