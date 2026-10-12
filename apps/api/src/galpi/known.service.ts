import { Injectable, Logger } from '@nestjs/common';
import { type ProfileFactKey, WIKI_PAGES, type WikiPageKey } from '@prologue/shared';
import { PrismaService } from '../prisma/prisma.service';
import { isKnown } from './known';
import { ReportService } from './report/report.service';
import { WikiService } from './wiki/wiki.service';

/** 알게 된 순간을 표시하고 첫 리포트를 쓴다 (AI 엔진 문서 5.4·6장) */
@Injectable()
export class KnownService {
  private readonly logger = new Logger(KnownService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wiki: WikiService,
    private readonly report: ReportService,
  ) {}

  /** 처음 알게 된 순간에만 true. 두 곳에서 동시에 불러도 리포트는 한 번 (리뷰 4) */
  async checkAndMarkKnown(userId: string, now = new Date()): Promise<boolean> {
    const state = await this.prisma.galpiState.findUnique({ where: { userId } });
    if (!state || state.knownAt) return false;

    const snapshot = await this.wiki.snapshot(userId);
    const claimCounts = Object.fromEntries(WIKI_PAGES.map((p) => [p, snapshot.pages[p].length])) as Record<WikiPageKey, number>;
    const factValues: Partial<Record<ProfileFactKey, string | null>> = {};
    for (const [key, fact] of Object.entries(snapshot.facts)) factValues[key as ProfileFactKey] = fact?.value ?? null;
    if (!isKnown({ userTurns: state.userTurns, claimCounts, factValues })) return false;

    const { count } = await this.prisma.galpiState.updateMany({ where: { userId, knownAt: null }, data: { knownAt: now } });
    if (count === 0) return false;
    try {
      await this.report.generateFirst(userId, now);
    } catch (error) {
      // 리포트를 못 쓰면 표시를 되돌려 다음 수집 때 다시 본다
      await this.prisma.galpiState.updateMany({ where: { userId, knownAt: now }, data: { knownAt: null } });
      this.logger.warn(`first report failed user=${userId}`);
      throw error;
    }
    return true;
  }
}
