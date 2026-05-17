import { Injectable, Logger } from '@nestjs/common';
import type { FaceVerificationProvider, FaceVerificationResult } from '@prologue/shared';

@Injectable()
export class MockFaceVerificationService implements FaceVerificationProvider {
  private readonly logger = new Logger(MockFaceVerificationService.name);

  async matchFaces(_idPhotoUrl: string, _livePhotoUrl: string): Promise<FaceVerificationResult> {
    this.logger.log('[mock-face] matchFaces → matched=true confidence=95');
    return { matched: true, confidence: 95 };
  }
}
