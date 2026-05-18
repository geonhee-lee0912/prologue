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

  // === FR-K04 신고 관리 ===
  listReports(
    accessToken: string,
    params: { status?: string; page?: number; pageSize?: number } = {},
  ) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ items: ReportListItem[]; total: number }>(
      `/admin/reports${suffix}`,
      {},
      accessToken,
    );
  },
  getReport(accessToken: string, id: string) {
    return request<ReportDetail>(`/admin/reports/${id}`, {}, accessToken);
  },
  resolveReport(
    accessToken: string,
    id: string,
    payload: { action: ResolveAction; note?: string; suspendTarget?: boolean },
  ) {
    return request<ReportDetail>(`/admin/reports/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, accessToken);
  },

  // === FR-K01/K02 사용자 ===
  listUsers(
    accessToken: string,
    params: {
      q?: string;
      status?: string;
      identityVerified?: boolean;
      faceVerified?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.status) qs.set('status', params.status);
    if (params.identityVerified !== undefined) qs.set('identityVerified', String(params.identityVerified));
    if (params.faceVerified !== undefined) qs.set('faceVerified', String(params.faceVerified));
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ items: AdminUserListItem[]; total: number }>(
      `/admin/users${suffix}`,
      {},
      accessToken,
    );
  },
  getUser(accessToken: string, id: string) {
    return request<AdminUserDetail>(`/admin/users/${id}`, {}, accessToken);
  },
  setUserStatus(
    accessToken: string,
    id: string,
    payload: { status: 'active' | 'suspended'; note?: string },
  ) {
    return request<AdminUserDetail>(`/admin/users/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, accessToken);
  },

  // === FR-K01 검수 (사진 + 직업/재직) ===
  listPendingPhotos(accessToken: string) {
    return request<PendingPhotoView[]>('/admin/reviews/photos/pending', {}, accessToken);
  },
  decidePhoto(
    accessToken: string,
    photoId: string,
    payload: { decision: 'approve' | 'reject'; reason?: string },
  ) {
    return request<{ id: string; reviewStatus: 'approved' | 'rejected' }>(
      `/admin/reviews/photos/${photoId}/decision`,
      { method: 'POST', body: JSON.stringify(payload) },
      accessToken,
    );
  },
  listPendingEmployment(accessToken: string) {
    return request<PendingEmploymentView[]>('/admin/reviews/employment/pending', {}, accessToken);
  },
  decideEmployment(
    accessToken: string,
    userId: string,
    payload: { decision: 'approve' | 'reject'; reason?: string },
  ) {
    return request<{ userId: string; employmentVerificationStatus: 'verified' | 'rejected' }>(
      `/admin/reviews/employment/${userId}/decision`,
      { method: 'POST', body: JSON.stringify(payload) },
      accessToken,
    );
  },
};

export interface PendingPhotoView {
  id: string;
  userId: string;
  photoType: string;
  isMain: boolean;
  moderationFlags: string[];
  signedUrl: string | null;
  createdAt: string;
  user: { gender: string; birthYear: number; region1: string };
}

export interface PendingEmploymentView {
  userId: string;
  user: {
    gender: string;
    birthYear: number;
    region1: string;
    region2: string | null;
    status: string;
  };
  profileJobCategory: string | null;
  employmentVerificationStatus: string;
  updatedAt: string;
}

export type ResolveAction =
  | 'dismiss'
  | 'resolve_no_action'
  | 'resolve_warned'
  | 'resolve_suspended';

export interface ReportListItem {
  id: string;
  reportType: string;
  status: string;
  createdAt: string;
  reporter: { id: string; gender: string; birthYear: number };
  targetUser: { id: string; gender: string; birthYear: number; status: string };
}

// === FR-K01/K02 사용자 ===

export interface AdminUserListItem {
  id: string;
  gender: string;
  birthYear: number;
  region1: string;
  region2: string | null;
  status: string;
  membershipType: string;
  createdAt: string;
  loginProvider: string;
  identityVerified: boolean;
  faceMatchStatus: string;
  reportsReceivedCount: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  profile: {
    intro: string | null;
    jobCategory: string | null;
    lifestyleTags: string[];
    completionScore: number;
  } | null;
  verification: {
    identityVerifiedAt: string | null;
    faceVerifiedAt: string | null;
    ageVerified: boolean;
    mannerPledgeAgreed: boolean;
    singlePledgeAgreed: boolean;
    employmentVerificationStatus: string;
  };
  relationshipPreference: {
    intent: string;
    pace: string;
    contactFrequency: string;
  } | null;
  withdrawnAt: string | null;
  lastReports: Array<{
    id: string;
    reportType: string;
    status: string;
    createdAt: string;
    isReporter: boolean;
  }>;
}

export interface ReportDetail {
  id: string;
  reportType: string;
  description: string | null;
  status: string;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: {
    id: string;
    gender: string;
    birthYear: number;
    region1: string;
    region2: string | null;
    status: string;
  };
  targetUser: {
    id: string;
    gender: string;
    birthYear: number;
    region1: string;
    region2: string | null;
    status: string;
    profile: { jobCategory: string | null; intro: string | null } | null;
    pastReportCount: number;
  };
  conversation: {
    id: string;
    status: string;
    messages: Array<{
      id: string;
      senderId: string | null;
      messageType: string;
      content: string;
      createdAt: string;
    }>;
  } | null;
  reportedMessage: {
    id: string;
    senderId: string | null;
    content: string;
    createdAt: string;
  } | null;
}
