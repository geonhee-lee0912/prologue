/**
 * 푸시 알림 (FR-F01 매칭 도착, FR-G01 대화 메시지 등)
 *
 * 실제 구현체: Expo Push (FCM / APNs 자동 라우팅)
 */
export const PUSH_PROVIDER = 'PUSH_PROVIDER';

export interface PushMessage {
  /** Expo push token */
  to: string;
  title: string;
  body: string;
  /** 클라이언트가 해석할 추가 페이로드 */
  data?: Record<string, unknown>;
}

export interface PushSendResult {
  /** 푸시 서비스가 발급한 ID */
  id: string;
  status: 'ok' | 'error';
  errorMessage?: string;
}

export interface PushProvider {
  send(message: PushMessage): Promise<PushSendResult>;
}
