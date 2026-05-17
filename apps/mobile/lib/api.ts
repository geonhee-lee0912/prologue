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

  // === 프로필 ===
  getMyProfile(accessToken: string) {
    return request<ProfileResponse>('/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  updateMyProfile(accessToken: string, dto: ProfilePatch) {
    return request<ProfileResponse>('/me/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(dto),
    });
  },

  // === 사진 ===
  listPhotos(accessToken: string) {
    return request<PhotoView[]>('/me/photos', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  async uploadPhoto(
    accessToken: string,
    asset: { uri: string; mimeType?: string; fileName?: string; file?: File },
    photoType?: 'main' | 'daily' | 'hobby',
  ): Promise<PhotoView> {
    const formData = new FormData();
    if (asset.file) {
      // Web: 실제 File 객체
      formData.append('file', asset.file);
    } else {
      // Native: { uri, type, name } 형태
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
      } as unknown as Blob);
    }
    if (photoType) formData.append('photoType', photoType);

    const res = await fetch(`${BASE_URL}/me/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
    const body = (await res.json().catch(() => null)) as
      | { data?: PhotoView; error?: { code: string; message: string } }
      | null;
    if (!res.ok) {
      throw new ApiError(
        body?.error?.code ?? 'UNKNOWN',
        body?.error?.message ?? `HTTP ${res.status}`,
        res.status,
      );
    }
    return body!.data!;
  },
  deletePhoto(accessToken: string, photoId: string) {
    return request<{ deleted: true }>(`/me/photos/${photoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  setMainPhoto(accessToken: string, photoId: string) {
    return request<PhotoView[]>(`/me/photos/${photoId}/main`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // === 얼굴 인증 (FR-B02) ===
  getVerification(accessToken: string) {
    return request<VerificationStatus>('/me/verification', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  async verifyFace(
    accessToken: string,
    asset: { uri: string; mimeType?: string; fileName?: string; file?: File },
  ): Promise<FaceVerificationResult> {
    const formData = new FormData();
    if (asset.file) {
      formData.append('selfie', asset.file);
    } else {
      formData.append('selfie', {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? `selfie-${Date.now()}.jpg`,
      } as unknown as Blob);
    }
    const res = await fetch(`${BASE_URL}/me/verification/face`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
    const body = (await res.json().catch(() => null)) as
      | { data?: FaceVerificationResult; error?: { code: string; message: string } }
      | null;
    if (!res.ok) {
      throw new ApiError(
        body?.error?.code ?? 'UNKNOWN',
        body?.error?.message ?? `HTTP ${res.status}`,
        res.status,
      );
    }
    return body!.data!;
  },

  // === 추천 (FR-D) ===
  listRecommendations(accessToken: string) {
    return request<RecommendationCard[]>('/me/recommendations', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  getRecommendation(accessToken: string, id: string) {
    return request<RecommendationCard>(`/recommendations/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  markRecommendationShown(accessToken: string, id: string) {
    return request<{ status: string }>(`/recommendations/${id}/shown`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};

// ============== 프로필 타입 ==============

export interface AnswerItem {
  category: 'story' | 'relationship';
  questionKey: string;
  answer: string;
}

export interface PreferenceData {
  intent:
    | 'serious_long_term'
    | 'natural_dating'
    | 'open_to_marriage'
    | 'casual_meeting'
    | 'friendship_first';
  pace: 'slow' | 'moderate' | 'fast';
  contactFrequency: 'low' | 'medium' | 'high';
  extra?: Record<string, unknown> | null;
}

export interface ProfileResponse {
  user: {
    region1: string;
    region2: string | null;
    targetGender: string;
    gender: string;
    birthYear: number;
  };
  profile: {
    jobCategory: string | null;
    intro: string | null;
    lifestyleTags: string[];
  } | null;
  answers: AnswerItem[];
  preference: PreferenceData | null;
  completion: number;
}

export interface ProfilePatch {
  region1?: string;
  region2?: string;
  targetGender?: 'male' | 'female';
  jobCategory?: string;
  intro?: string;
  lifestyleTags?: string[];
  answers?: AnswerItem[];
  preference?: PreferenceData;
}

export interface PhotoView {
  id: string;
  photoType: 'main' | 'daily' | 'hobby';
  isMain: boolean;
  reviewStatus: string;
  moderationFlags: string[];
  signedUrl: string | null;
  createdAt: string;
}

export interface VerificationStatus {
  identityVerified: boolean;
  faceMatchStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  faceVerifiedAt: string | null;
  faceConfidence: number | null;
}

export interface FaceVerificationResult {
  matched: boolean;
  confidence: number;
  faceMatchStatus: 'verified' | 'rejected' | 'pending';
}

export interface RecommendationCard {
  id: string;
  recommendationDate: string;
  rank: number;
  status: 'created' | 'shown' | 'interested' | 'skipped' | 'expired';
  shownAt: string | null;
  target: {
    userId: string;
    gender: string;
    birthYear: number;
    region1: string;
    region2: string | null;
    profile: {
      jobCategory: string | null;
      intro: string | null;
      lifestyleTags: string[];
    } | null;
    mainPhotoUrl: string | null;
    badges: {
      identityVerified: boolean;
      faceMatchVerified: boolean;
      employmentVerified: boolean;
    };
  };
  reason: {
    summary: string;
    matchedPoints: string[];
    differencePoints: string[];
    conversationTopics: string[];
    curatorMemo: string;
  };
}
