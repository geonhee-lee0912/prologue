/**
 * 결제 (FR-I01 추천권, FR-I02 Plus 구독) — MVP 후순위
 *
 * 실제 구현체: 토스 / 아임포트 / Apple IAP / Google Billing
 */
export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

export type PaymentProductType = 'plus_subscription' | 'extra_recommendation';

export interface ChargeRequest {
  userId: string;
  orderId: string;
  productType: PaymentProductType;
  /** KRW */
  amount: number;
}

export interface ChargeResult {
  providerTxId: string;
  status: 'succeeded' | 'failed';
  succeededAt?: Date;
  failureReason?: string;
}

export interface PaymentProvider {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}
