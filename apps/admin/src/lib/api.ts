/**
 * 운영자 도구용 NestJS API 클라이언트.
 *
 * 서버 컴포넌트 / route handler 에서 사용. 토큰은 iron-session 에서 꺼내 전달.
 */

const BASE_URL = process.env.ADMIN_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export class AdminApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, cache: 'no-store' });
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code: string; message: string } }
    | null;

  if (!res.ok) {
    throw new AdminApiError(
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? `HTTP ${res.status}`,
      res.status,
    );
  }
  return body?.data as T;
}

export interface AdminProfile {
  id: string;
  email: string;
  role: 'owner' | 'manager' | 'reviewer';
}

export const adminApi = {
  login(email: string, password: string) {
    return request<{ accessToken: string; admin: AdminProfile }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  me(accessToken: string) {
    return request<AdminProfile>('/admin/auth/me', {}, accessToken);
  },
};
