import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 갈피가 먼저 건 말을 알릴 Expo 푸시 토큰 — 사용자당 하나(마지막 기기) */
@Injectable()
export class PushTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, token: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 한 기기에서 다른 사람이 로그인하면 앞사람의 토큰을 지운다 — 앞사람에게 갈 말이 이 기기에 뜨지 않게
      await tx.pushToken.deleteMany({ where: { token, userId: { not: userId } } });
      await tx.pushToken.upsert({ where: { userId }, create: { userId, token }, update: { token } });
    });
  }

  /** 로그아웃 */
  async remove(userId: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { userId } });
  }
}
