import { Inject, Injectable } from '@nestjs/common';
import {
  AI_LETTER_NOTICE,
  findForbidden,
  GALPI_COPY,
  type GalpiReportDto,
  isVisibleWikiPage,
  LLM_PROVIDER,
  type LlmMessage,
  type LlmProvider,
  renderName,
  scrubForStorage,
  VISIBLE_WIKI_PAGES,
  type VisibleWikiPage,
} from '@prologue/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { stripEmoji } from '../voice';
import { buildReportMessages } from './report.prompt';

/** 첫 리포트를 넣을 때 쓰는 클라이언트 — 알게 됨 표시와 같은 트랜잭션의 tx 다 (KnownService) */
export type ReportTx = Pick<PrismaService, 'selfReport' | 'galpiMessage'>;

/** 나에 대한 리포트 "제가 읽은 당신" — 첫 리포트는 무료, 소개에는 아무 영향이 없다 (AI 엔진 문서 6장) */
@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  /**
   * 첫 리포트 편지를 쓴다. 읽기와 LLM 호출뿐이고 DB 에 아무것도 적지 않는다 — 편지를 쓰는 몇 초 동안 프로세스가 죽어도
   * 남는 것이 없다. 넣는 일은 saveFirst 가 알게 됨 표시와 한 트랜잭션에서 한다. 쓸 문장이 하나도 남지 않으면 던진다
   */
  async writeFirstLetter(userId: string): Promise<string> {
    const claims = await this.prisma.wikiClaim.findMany({
      where: { userId, page: { in: [...VISIBLE_WIKI_PAGES] } },
      orderBy: { createdAt: 'asc' },
      select: { page: true, text: true },
    });
    const pages = Object.fromEntries(VISIBLE_WIKI_PAGES.map((p) => [p, [] as string[]])) as Record<VisibleWikiPage, string[]>;
    for (const claim of claims) if (isVisibleWikiPage(claim.page)) pages[claim.page].push(claim.text);
    return this.compose(userId, buildReportMessages(pages));
  }

  /**
   * 첫 리포트(무료)와 갈피의 알림을 넣는다. 알게 됨 표시를 차지한 같은 트랜잭션(tx)에서만 부른다 —
   * 이미 있는지는 여기서 보지 않는다(표시를 먼저 차지한 호출만 부르므로 한 번이다)
   */
  async saveFirst(tx: ReportTx, userId: string, body: string, now: Date): Promise<void> {
    await tx.selfReport.create({ data: { userId, body, paid: false, createdAt: now } });
    // 알림은 now+2·now+3 에 놓는다 — 같은 now 로 부르는 버튼 답이 갈피의 답을 now+1 에 놓으므로, 알림이 그 답 뒤에 온다
    await tx.galpiMessage.create({
      data: { userId, sender: 'galpi', kind: 'emoticon', content: 'proud', expression: 'proud', createdAt: new Date(now.getTime() + 2) },
    });
    await tx.galpiMessage.create({
      data: { userId, sender: 'galpi', kind: 'text', content: GALPI_COPY.firstReportDelivered, createdAt: new Date(now.getTime() + 3) },
    });
  }

  async latest(userId: string): Promise<GalpiReportDto | null> {
    const [report, user] = await Promise.all([
      this.prisma.selfReport.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { profile: { select: { displayName: true } } } }),
    ]);
    if (!report) return null;
    return {
      id: report.id,
      // 이름이 없으면 "{name}," 만 지워져 뒤의 줄바꿈이 남는다 — 편지는 앞 빈 줄 없이 시작한다
      body: renderName(report.body, user?.profile?.displayName ?? null, 'letter').trimStart(),
      aiNotice: AI_LETTER_NOTICE,
      createdAt: report.createdAt.toISOString(),
    };
  }

  /**
   * 금지 표현이 나오면 한 번 다시 쓰고, 그래도 남은 금지 표현과 새어 든 민감정보는 그 문장째 뺀다.
   * 저장 전 정리(연락처 지우기·민감정보 가리기)를 거친다. 호칭 말고는 남는 글이 없으면 던진다 —
   * 빈 편지를 두면 갈피는 써 두었다고 알리는데, 알게 됨 표시가 이미 있어 다시 쓰지도 않는다
   */
  private async compose(userId: string, messages: LlmMessage[]): Promise<string> {
    let body = await this.complete(userId, messages);
    let found = findForbidden(body);
    if (found.length) {
      body = await this.complete(userId, [
        ...messages,
        { role: 'system', content: `방금 쓴 편지에 쓰지 않는 말(${found.join(', ')})이 있었다. 그 말 없이 다시 쓴다.` },
      ]);
      found = findForbidden(body);
    }
    const letter = stripEmoji(dropSentences(scrubForStorage(body).text, [...found, '[민감정보:']));
    if (!renderName(letter, null, 'letter').trim()) throw new Error('first report is empty');
    return letter;
  }

  private async complete(userId: string, messages: LlmMessage[]): Promise<string> {
    const result = await this.llm.complete({ purpose: 'report', userId, messages, maxOutputTokens: 900 });
    return result.content.trim();
  }
}

/** 문장 단위로 걸러 낸다. 문단(줄바꿈)은 그대로 둔다 */
function dropSentences(text: string, needles: string[]): string {
  return text
    .split('\n')
    .map((line) =>
      line
        .split(/(?<=[.?!])\s+/)
        .filter((sentence) => !needles.some((needle) => sentence.includes(needle)))
        .join(' '),
    )
    .join('\n');
}
