import { Module } from '@nestjs/common';
import { FaceVerificationController } from './face.controller';
import { FaceVerificationService } from './face.service';

@Module({
  controllers: [FaceVerificationController],
  providers: [FaceVerificationService],
  exports: [FaceVerificationService],
})
export class VerificationModule {}
