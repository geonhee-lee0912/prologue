import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PushMessage, PushProvider, PushSendResult } from '@prologue/shared';

@Injectable()
export class MockPushService implements PushProvider {
  private readonly logger = new Logger(MockPushService.name);

  async send(message: PushMessage): Promise<PushSendResult> {
    this.logger.log(`[mock-push] to=${message.to.slice(0, 8)}... title="${message.title}"`);
    return { id: randomUUID(), status: 'ok' };
  }
}
