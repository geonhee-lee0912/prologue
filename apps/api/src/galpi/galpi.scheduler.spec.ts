import { Logger } from '@nestjs/common';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { GalpiScheduler } from './galpi.scheduler';
import type { ProactiveService } from './proactive/proactive.service';
import type { IngestService } from './wiki/ingest.service';

let log: MockInstance<Logger['log']>;
let warn: MockInstance<Logger['warn']>;

beforeEach(() => {
  // 다른 서비스 spec 처럼 Nest 로거를 막아 테스트 출력을 깨끗하게 둔다
  log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const MINUTE = 60_000;

/** 다음 시각들 사이의 간격(ms) */
function gaps(dates: { toMillis(): number }[]): number[] {
  return dates.slice(1).map((d, i) => d.toMillis() - dates[i].toMillis());
}

/** 서비스 대역으로 예약 작업을 만든다 */
function make(overrides: { runOnce?: () => Promise<number>; sweep?: () => Promise<number> } = {}) {
  const runOnce = vi.fn(overrides.runOnce ?? (async () => 0));
  const sweep = vi.fn(overrides.sweep ?? (async () => 0));
  const scheduler = new GalpiScheduler({ runOnce } as unknown as ProactiveService, { sweep } as unknown as IngestService);
  return { scheduler, runOnce, sweep };
}

describe('갈피 예약 작업', () => {
  it('앞 작업이 아직 돌고 있으면 이번 시각은 건너뛴다', async () => {
    let finish: (sent: number) => void = () => undefined;
    const runOnce = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          finish = resolve;
        }),
    );
    const scheduler = new GalpiScheduler({ runOnce } as unknown as ProactiveService, { sweep: vi.fn() } as unknown as IngestService);
    const first = scheduler.proactiveTick();
    await scheduler.proactiveTick();
    finish(0);
    await first;
    expect(runOnce).toHaveBeenCalledTimes(1);
  });

  it('작업이 실패해도 예약 작업은 죽지 않는다', async () => {
    const sweep = vi.fn().mockRejectedValue(new Error('db down'));
    const scheduler = new GalpiScheduler({ runOnce: vi.fn() } as unknown as ProactiveService, { sweep } as unknown as IngestService);
    await expect(scheduler.ingestTick()).resolves.toBeUndefined();
  });

  it('Error 가 아닌 것으로 거절돼도(undefined·null·문자열) 예약 작업은 던지지 않는다', async () => {
    for (const reason of [undefined, null, 'boom', 42]) {
      const { scheduler } = make({ sweep: () => Promise.reject(reason) });
      await expect(scheduler.ingestTick()).resolves.toBeUndefined();
    }
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it('실패 로그에는 작업 이름과 오류 종류만 남고, 오류 메시지는 남기지 않는다 (CLAUDE.md 10.3)', async () => {
    // 질의 실패 메시지에 사용자 말이 섞여 오는 경우 (Prisma 검증 오류가 쓰려던 데이터를 담는다)
    const error = Object.assign(new Error('Invalid value for 지은: 오늘 발표 망했어'), { name: 'DbDownError' });
    const { scheduler } = make({ runOnce: () => Promise.reject(error) });
    await scheduler.proactiveTick();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('proactive tick failed: DbDownError');
    const logged = [...warn.mock.calls, ...log.mock.calls].flat().join(' ');
    expect(logged).not.toContain('지은');
    expect(logged).not.toContain('발표');
  });

  it('성공하면 개수만 남긴다 — 0 이면 조용하다', async () => {
    const { scheduler } = make({ runOnce: async () => 3, sweep: async () => 0 });
    await scheduler.proactiveTick();
    await scheduler.ingestTick();
    expect(log.mock.calls).toEqual([['proactive count=3']]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('앞 작업이 실패하거나 끝나면 다음 시각에는 다시 돈다', async () => {
    const runOnce = vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValueOnce(1).mockResolvedValue(0);
    const { scheduler } = make({ runOnce });
    await scheduler.proactiveTick(); // 실패 — 잠금이 풀려야 한다
    await scheduler.proactiveTick(); // 성공
    await scheduler.proactiveTick(); // 끝난 뒤에도 다시
    expect(runOnce).toHaveBeenCalledTimes(3);
  });

  it('먼저 말 걸기가 돌고 있어도 서고 수집은 건너뛰지 않는다 — 작업끼리 서로 막지 않는다', async () => {
    let finish: (sent: number) => void = () => undefined;
    const { scheduler, runOnce, sweep } = make({
      runOnce: () =>
        new Promise<number>((resolve) => {
          finish = resolve;
        }),
    });
    const proactive = scheduler.proactiveTick();
    await scheduler.ingestTick();
    expect(sweep).toHaveBeenCalledTimes(1);
    expect(runOnce).toHaveBeenCalledTimes(1);
    finish(0);
    await proactive;
  });

  it('ScheduleModule 이 두 작업을 이름대로 등록한다 — 먼저 말 걸기는 한국 시간 매시 정각, 수집은 10분마다', async () => {
    const { scheduler, runOnce, sweep } = make({ runOnce: async () => 1, sweep: async () => 1 });
    const moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [{ provide: GalpiScheduler, useValue: scheduler }],
    }).compile();
    await moduleRef.init();
    try {
      const jobs = moduleRef.get(SchedulerRegistry).getCronJobs();
      expect([...jobs.keys()].sort()).toEqual(['galpi-ingest', 'galpi-proactive']);

      // 서버 시간대가 UTC 여도 한국 시간 기준이다 (global-constraints: 날짜·시각 규칙은 전부 Asia/Seoul)
      const proactiveAt = jobs.get('galpi-proactive')!.nextDates(3);
      expect(proactiveAt.every((d) => d.zoneName === 'Asia/Seoul' && d.minute === 0 && d.second === 0)).toBe(true);
      expect(gaps(proactiveAt)).toEqual([60 * MINUTE, 60 * MINUTE]);
      const ingestAt = jobs.get('galpi-ingest')!.nextDates(3);
      expect(ingestAt.every((d) => d.minute % 10 === 0 && d.second === 0)).toBe(true);
      expect(gaps(ingestAt)).toEqual([10 * MINUTE, 10 * MINUTE]);

      // 이름과 일이 맞게 이어졌는지 — 이름이 서로 바뀌면 안 된다
      jobs.get('galpi-proactive')!.fireOnTick();
      await vi.waitFor(() => expect(runOnce).toHaveBeenCalledTimes(1));
      expect(sweep).not.toHaveBeenCalled();
      jobs.get('galpi-ingest')!.fireOnTick();
      await vi.waitFor(() => expect(sweep).toHaveBeenCalledTimes(1));
      expect(runOnce).toHaveBeenCalledTimes(1);
    } finally {
      await moduleRef.close();
    }
  });
});
