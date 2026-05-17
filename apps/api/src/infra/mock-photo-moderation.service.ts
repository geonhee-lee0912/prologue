import { Injectable, Logger } from '@nestjs/common';
import type { PhotoModerationProvider, PhotoModerationResult } from '@prologue/shared';

@Injectable()
export class MockPhotoModerationService implements PhotoModerationProvider {
  private readonly logger = new Logger(MockPhotoModerationService.name);

  async moderate(imageUrl: string): Promise<PhotoModerationResult> {
    this.logger.log(`[mock-photo-moderation] ${imageUrl} → flags=[]`);
    return { flags: [] };
  }
}
