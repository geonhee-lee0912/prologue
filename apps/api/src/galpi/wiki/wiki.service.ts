import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ErrorCode,
  type GalpiMemoryDto,
  isVisibleWikiPage,
  type ProfileFactKey,
  VISIBLE_WIKI_PAGES,
  WIKI_PAGE_TITLES,
  WIKI_PAGES,
  type WikiPageKey,
} from '@prologue/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';

export interface WikiClaimView {
  id: string;
  text: string;
}

export interface WikiSnapshot {
  pages: Record<WikiPageKey, WikiClaimView[]>;
  facts: Partial<Record<ProfileFactKey, { value: string | null; letterAllowed: boolean | null }>>;
}

/**
 * 갈피의 서고 — 사용자별 위키 (AI 엔진 문서 3장)
 * 서고는 AI 만 본다(하드룰 2). 본인에게는 보이는 장만 열어 준다.
 */
@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(userId: string): Promise<WikiSnapshot> {
    const [claims, facts] = await Promise.all([
      this.prisma.wikiClaim.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { id: true, page: true, text: true } }),
      this.prisma.profileFact.findMany({ where: { userId }, select: { key: true, value: true, letterAllowed: true } }),
    ]);
    const pages = Object.fromEntries(WIKI_PAGES.map((p) => [p, [] as WikiClaimView[]])) as Record<WikiPageKey, WikiClaimView[]>;
    for (const claim of claims) pages[claim.page as WikiPageKey].push({ id: claim.id, text: claim.text });
    const factMap: WikiSnapshot['facts'] = {};
    for (const fact of facts) factMap[fact.key as ProfileFactKey] = { value: fact.value, letterAllowed: fact.letterAllowed };
    return { pages, facts: factMap };
  }

  /** 갈피가 기억하는 것 — 보이는 장의 문장만 (AI 만 보는 장은 어떤 응답에도 없다) */
  async listVisible(userId: string): Promise<GalpiMemoryDto[]> {
    const claims = await this.prisma.wikiClaim.findMany({
      where: { userId, page: { in: [...VISIBLE_WIKI_PAGES] } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, page: true, text: true },
    });
    return claims.flatMap((claim) =>
      isVisibleWikiPage(claim.page) ? [{ id: claim.id, page: claim.page, pageTitle: WIKI_PAGE_TITLES[claim.page], text: claim.text }] : [],
    );
  }

  /**
   * 갈피 빼기 — 문장과 그 출처 원문까지 지운다. 같은 원문에서만 나온 다른 문장도 출처가 없어져 함께 지운다
   * (AI 엔진 문서 3.6, 갈피 문서 3.6 ① "갈피를 빼면 그 장은 다시 펼치지 않아요")
   */
  async removeClaim(userId: string, claimId: string): Promise<void> {
    const claim = await this.prisma.wikiClaim.findFirst({
      where: { id: claimId, userId, page: { in: [...VISIBLE_WIKI_PAGES] } },
      include: { sources: true },
    });
    if (!claim) throw new AppException(ErrorCode.NOT_FOUND, '찾을 수 없어요.', HttpStatus.NOT_FOUND);
    const messageIds = claim.sources.map((s) => s.messageId);
    await this.prisma.$transaction(async (tx) => {
      await tx.galpiMessage.deleteMany({ where: { id: { in: messageIds }, userId } });
      await tx.wikiClaim.deleteMany({ where: { id: claimId, userId } });
      await tx.wikiClaim.deleteMany({ where: { userId, sources: { none: {} } } });
    });
  }
}
