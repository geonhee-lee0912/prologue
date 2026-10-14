import { Injectable, Logger } from '@nestjs/common';
import { type ProfileFactKey, WIKI_PAGES, type WikiPageKey } from '@prologue/shared';
import { describeError } from '../common/describe-error';
import { PrismaService } from '../prisma/prisma.service';
import { isKnown } from './known';
import { ReportService } from './report/report.service';
import { WikiService } from './wiki/wiki.service';

/**
 * 알게 된 순간을 표시하고 첫 리포트를 쓴다 (AI 엔진 문서 5.4·6장)
 * 편지를 먼저 쓰고(DB 에 아무것도 적지 않는다), 표시와 리포트·알림은 한 트랜잭션으로 넣는다 —
 * 편지를 기다리는 동안 프로세스가 죽거나 저장이 실패해도 "알게 됐는데 리포트가 없는" 상태가 남지 않는다
 */
@Injectable()
export class KnownService {
  private readonly logger = new Logger(KnownService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wiki: WikiService,
    private readonly report: ReportService,
  ) {}

  /**
   * 처음 알게 된 순간에만 true. 두 곳에서 동시에 불러도 리포트는 한 번 (리뷰 4) —
   * 둘 다 편지를 쓸 수는 있지만, 표시를 먼저 차지한 쪽만 리포트를 넣고 나머지는 편지를 버린다
   */
  async checkAndMarkKnown(userId: string, now = new Date()): Promise<boolean> {
    const state = await this.prisma.galpiState.findUnique({ where: { userId } });
    if (!state || state.knownAt) return false;

    const snapshot = await this.wiki.snapshot(userId);
    const claimCounts = Object.fromEntries(WIKI_PAGES.map((p) => [p, snapshot.pages[p].length])) as Record<WikiPageKey, number>;
    const factValues: Partial<Record<ProfileFactKey, string | null>> = {};
    for (const [key, fact] of Object.entries(snapshot.facts)) factValues[key as ProfileFactKey] = fact?.value ?? null;
    if (!isKnown({ userTurns: state.userTurns, claimCounts, factValues })) return false;

    try {
      // 편지부터 쓴다 — 못 쓰면 아무것도 적히지 않았으니 그대로 다시 던지고, 다음 수집 때 다시 본다
      const letter = await this.report.writeFirstLetter(userId);
      const first = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.galpiState.updateMany({ where: { userId, knownAt: null }, data: { knownAt: now } });
        // 다른 호출이 먼저 알게 됐다 — 이 편지는 버린다
        if (count === 0) return false;
        await this.report.saveFirst(tx, userId, letter, now);
        return true;
      });
      if (first) this.logger.log(`first report written user=${userId}`);
      return first;
    } catch (error) {
      // 원인(상태·code·시간 초과, DB 오류 code)만 남긴다 — 오류 메시지는 쓰지 않는다 (CLAUDE.md 10.3)
      this.logger.warn(`first report failed user=${userId} error=${describeError(error)}`);
      throw error;
    }
  }
}
