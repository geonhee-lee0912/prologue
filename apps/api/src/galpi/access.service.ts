import { HttpStatus, Injectable } from '@nestjs/common';
import { AI_REQUIRED_CONSENTS, ErrorCode } from '@prologue/shared';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';

interface AccessView {
  status: string;
  auth: { identityVerified: boolean } | null;
  consents: { consentType: string; agreed: boolean }[];
}

/**
 * 갈피 출입 조건
 * - 본인인증을 해야 모든 기능을 쓴다 (AI 엔진 문서 9장)
 * - 대화는 민감정보·국외이전 별도 동의도 있어야 한다 (CLAUDE.md 10.2b·10.2c). 열람·삭제는 동의를 철회해도 된다
 */
@Injectable()
export class GalpiAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** 서고 열람·빼기, 리포트 보기, 대화 기록 보기 */
  async assertVerified(userId: string): Promise<void> {
    this.checkVerified(await this.load(userId));
  }

  /** 갈피와 대화 — 말이 LLM 으로 간다 */
  async assertCanTalk(userId: string): Promise<void> {
    const user = await this.load(userId);
    this.checkVerified(user);
    for (const type of AI_REQUIRED_CONSENTS) {
      // 가장 최근 기록이 동의여야 한다 — 철회하면 agreed=false 기록이 새로 남는다
      const latest = user.consents.find((c) => c.consentType === type);
      if (!latest?.agreed) {
        throw new AppException(ErrorCode.AI_CONSENT_REQUIRED, '갈피와 이야기하려면 동의가 필요해요.', HttpStatus.FORBIDDEN);
      }
    }
  }

  private async load(userId: string): Promise<AccessView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        auth: { select: { identityVerified: true } },
        consents: {
          where: { consentType: { in: [...AI_REQUIRED_CONSENTS] } },
          orderBy: { agreedAt: 'desc' },
          select: { consentType: true, agreed: true },
        },
      },
    });
    if (!user) throw new AppException(ErrorCode.NOT_FOUND, '사용자를 찾을 수 없어요.', HttpStatus.NOT_FOUND);
    return user;
  }

  private checkVerified(user: AccessView): void {
    if (user.status === 'suspended') {
      throw new AppException(ErrorCode.ACCOUNT_SUSPENDED, '이용이 제한된 계정이에요.', HttpStatus.FORBIDDEN);
    }
    if (user.status === 'withdrawn') {
      throw new AppException(ErrorCode.ACCOUNT_WITHDRAWN, '탈퇴한 계정이에요.', HttpStatus.FORBIDDEN);
    }
    if (!user.auth?.identityVerified) {
      throw new AppException(ErrorCode.IDENTITY_VERIFICATION_REQUIRED, '본인인증을 먼저 해 주세요.', HttpStatus.FORBIDDEN);
    }
  }
}
