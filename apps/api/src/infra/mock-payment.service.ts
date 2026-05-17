import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ChargeRequest, ChargeResult, PaymentProvider } from '@prologue/shared';

@Injectable()
export class MockPaymentService implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentService.name);

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.logger.log(
      `[mock-payment] charge userId=${request.userId} product=${request.productType} amount=${request.amount}`,
    );
    return {
      providerTxId: `mock_${randomUUID()}`,
      status: 'succeeded',
      succeededAt: new Date(),
    };
  }
}
