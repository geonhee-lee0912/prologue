import { type IronSession, type SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface AdminSession {
  accessToken?: string;
  admin?: {
    id: string;
    email: string;
    role: 'owner' | 'manager' | 'reviewer';
  };
}

const sessionPassword = process.env.ADMIN_SESSION_SECRET;

export const sessionOptions: SessionOptions = {
  // 32+ 바이트 강한 랜덤. 운영에서는 반드시 환경변수로.
  password: sessionPassword ?? 'dev-only-session-password-please-replace-32bytes-min',
  cookieName: process.env.ADMIN_SESSION_COOKIE_NAME ?? 'prologue_admin_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  },
};

export async function getSession(): Promise<IronSession<AdminSession>> {
  return getIronSession<AdminSession>(cookies(), sessionOptions);
}
