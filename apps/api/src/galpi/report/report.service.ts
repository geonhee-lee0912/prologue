import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AI_LETTER_NOTICE,
  findForbidden,
  GALPI_COPY,
  type GalpiReportDto,
  isVisibleWikiPage,
  LLM_PROVIDER,
  type LlmMessage,
  type LlmProvider,
  maskSensitive,
  renderName,
  VISIBLE_WIKI_PAGES,
  type VisibleWikiPage,
} from '@prologue/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { stripEmoji } from '../voice';
import { buildReportMessages } from './report.prompt';

/** 나에 대한 리포트 "제가 읽은 당신" — 첫 리포트는 무료, 소개에는 아무 영향이 없다 (AI 엔진 문서 6장) */
@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  /** 첫 리포트 — 이미 있으면 아무것도 하지 않는다 */
  async generateFirst(userId: string, now = new Date()): Promise<void> {
    if ((await this.prisma.selfReport.count({ where: { userId } })) > 0) return;
    const claims = await this.prisma.wikiClaim.findMany({
      where: { userId, page: { in: [...VISIBLE_WIKI_PAGES] } },
      orderBy: { createdAt: 'asc' },
      select: { page: true, text: true },
    });
    const pages = Object.fromEntries(VISIBLE_WIKI_PAGES.map((p) => [p, [] as string[]])) as Record<VisibleWikiPage, string[]>;
    for (const claim of claims) if (isVisibleWikiPage(claim.page)) pages[claim.page].push(claim.text);

    const body = await this.write(userId, buildReportMessages(pages));
    await this.prisma.$transaction(async (tx) => {
      await tx.selfReport.create({ data: { userId, body, paid: false, createdAt: now } });
      // 알림은 now+2·now+3 에 놓는다 — 같은 now 로 부르는 버튼 답이 갈피의 답을 now+1 에 놓으므로, 알림이 그 답 뒤에 온다
      await tx.galpiMessage.create({
        data: { userId, sender: 'galpi', kind: 'emoticon', content: 'proud', expression: 'proud', createdAt: new Date(now.getTime() + 2) },
      });
      await tx.galpiMessage.create({
        data: { userId, sender: 'galpi', kind: 'text', content: GALPI_COPY.firstReportDelivered, createdAt: new Date(now.getTime() + 3) },
      });
    });
    this.logger.log(`first report written user=${userId}`);
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
   * 쓸 문장이 하나도 남지 않으면 던진다 — 빈 편지를 두면 "이미 있다"로 다시 쓰지 않고 갈피는 써 두었다고 알린다
   */
  private async write(userId: string, messages: LlmMessage[]): Promise<string> {
    let body = await this.complete(userId, messages);
    let found = findForbidden(body);
    if (found.length) {
      body = await this.complete(userId, [
        ...messages,
        { role: 'system', content: `방금 쓴 편지에 쓰지 않는 말(${found.join(', ')})이 있었다. 그 말 없이 다시 쓴다.` },
      ]);
      found = findForbidden(body);
    }
    const letter = stripEmoji(dropSentences(maskSensitive(body).masked, [...found, '[민감정보:']));
    if (!letter) throw new Error('first report is empty');
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
