import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ProactiveService } from './proactive/proactive.service';
import { IngestService } from './wiki/ingest.service';

type Job = 'proactive' | 'ingest';

/**
 * 갈피 예약 작업 (데이터 흐름 패턴 4)
 * 서버가 여러 대여도 조건부 갱신으로 한 번만 일어난다(리뷰 4). 한 번의 작업이 길어지면 BullMQ 로 옮긴다(BACKLOG 10절)
 */
@Injectable()
export class GalpiScheduler {
  private readonly logger = new Logger(GalpiScheduler.name);
  /** 앞 작업이 아직 돌고 있으면 이번 시각은 건너뛴다 */
  private readonly busy = new Set<Job>();

  constructor(
    private readonly proactive: ProactiveService,
    private readonly ingest: IngestService,
  ) {}

  /** 매시 정각(한국 시간) — 먼저 말 걸기 */
  @Cron('0 * * * *', { name: 'galpi-proactive', timeZone: 'Asia/Seoul' })
  proactiveTick(): Promise<void> {
    return this.run('proactive', () => this.proactive.runOnce());
  }

  /** 10분마다 — 멈춘 대화를 서고에 정리 */
  @Cron('*/10 * * * *', { name: 'galpi-ingest' })
  ingestTick(): Promise<void> {
    return this.run('ingest', () => this.ingest.sweep());
  }

  private async run(job: Job, work: () => Promise<number>): Promise<void> {
    if (this.busy.has(job)) return;
    this.busy.add(job);
    try {
      const count = await work();
      if (count > 0) this.logger.log(`${job} count=${count}`);
    } catch (error) {
      // 로그에는 오류 종류만 — 메시지에 사용자 정보가 섞일 수 있다 (CLAUDE.md 10.3).
      // Error 가 아닌 것(undefined·문자열)이 던져져도 여기서 또 던지지 않는다
      this.logger.warn(`${job} tick failed: ${error instanceof Error ? error.name : typeof error}`);
    } finally {
      this.busy.delete(job);
    }
  }
}
