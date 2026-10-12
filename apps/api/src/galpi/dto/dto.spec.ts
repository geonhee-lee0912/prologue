import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AnswerQuickReplyDto } from './answer-quick-reply.dto';
import { GalpiHistoryQueryDto } from './history-query.dto';
import { EXPO_PUSH_TOKEN, PushTokenDto } from './push-token.dto';
import { SendGalpiMessageDto } from './send-message.dto';

/** main.ts 의 전역 ValidationPipe 와 같은 옵션으로 검사하고, 틀린 필드 이름을 돌려준다 */
async function invalid<T extends object>(cls: new () => T, plain: object): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, plain), { whitelist: true, forbidNonWhitelisted: true });
  return errors.map((e) => e.property);
}

describe('갈피 DTO', () => {
  it('보내는 말은 1000자까지, "다른 얘기 할래요"는 빈 문자열과 skipped 로 온다', async () => {
    expect(await invalid(SendGalpiMessageDto, { text: '안녕' })).toEqual([]);
    expect(await invalid(SendGalpiMessageDto, { text: '', skipped: true })).toEqual([]);
    expect(await invalid(SendGalpiMessageDto, { text: 'a'.repeat(1001) })).toEqual(['text']);
    expect(await invalid(SendGalpiMessageDto, { skipped: true })).toEqual(['text']);
    expect(await invalid(SendGalpiMessageDto, { text: '안녕', expression: 'proud' })).toEqual(['expression']);
  });

  it('기록 조회의 limit 은 1~100 숫자다 (쿼리 문자열을 숫자로 바꾼다)', async () => {
    expect(await invalid(GalpiHistoryQueryDto, { limit: '20', before: 'm1' })).toEqual([]);
    expect(await invalid(GalpiHistoryQueryDto, { limit: '0' })).toEqual(['limit']);
    expect(await invalid(GalpiHistoryQueryDto, { limit: '500' })).toEqual(['limit']);
  });

  it('버튼 답은 짧은 key 문자열이다', async () => {
    expect(await invalid(AnswerQuickReplyDto, { key: 'allow' })).toEqual([]);
    expect(await invalid(AnswerQuickReplyDto, { key: 5 })).toEqual(['key']);
  });

  it('푸시 토큰은 Expo 모양만 받는다', async () => {
    expect(await invalid(PushTokenDto, { token: 'ExponentPushToken[AbC123_-x]' })).toEqual([]);
    expect(await invalid(PushTokenDto, { token: 'not-a-token' })).toEqual(['token']);
  });
});

describe('갈피 DTO — 경계와 거절', () => {
  it('보내는 말은 1000자 딱 맞으면 통과하고, 글자(코드 포인트) 수로 센다 — 서비스가 자르는 기준과 같다', async () => {
    expect(await invalid(SendGalpiMessageDto, { text: 'a'.repeat(1000) })).toEqual([]);
    // 이모지는 UTF-16 으로 두 칸이지만 한 글자다 (서비스의 truncateCodePoints 와 같은 센 법)
    expect(await invalid(SendGalpiMessageDto, { text: '😀'.repeat(1000) })).toEqual([]);
    expect(await invalid(SendGalpiMessageDto, { text: '😀'.repeat(1001) })).toEqual(['text']);
  });

  it('보내는 말은 문자열이고 skipped 는 불리언이다', async () => {
    expect(await invalid(SendGalpiMessageDto, { text: 5 })).toEqual(['text']);
    expect(await invalid(SendGalpiMessageDto, { text: ['안녕'] })).toEqual(['text']);
    expect(await invalid(SendGalpiMessageDto, { text: '안녕', skipped: 'yes' })).toEqual(['skipped']);
    expect(await invalid(SendGalpiMessageDto, { text: '안녕', skipped: false })).toEqual([]);
  });

  it('기록 조회의 limit 은 정수 1~100 이다', async () => {
    expect(await invalid(GalpiHistoryQueryDto, { limit: '1' })).toEqual([]);
    expect(await invalid(GalpiHistoryQueryDto, { limit: '100' })).toEqual([]);
    expect(await invalid(GalpiHistoryQueryDto, { limit: '101' })).toEqual(['limit']);
    expect(await invalid(GalpiHistoryQueryDto, { limit: '1.5' })).toEqual(['limit']);
    expect(await invalid(GalpiHistoryQueryDto, { limit: 'abc' })).toEqual(['limit']);
    expect(await invalid(GalpiHistoryQueryDto, { limit: '' })).toEqual(['limit']);
  });

  it('기록 조회는 아무것도 없어도 되고, before 는 64자까지고, 모르는 쿼리는 거절한다', async () => {
    expect(await invalid(GalpiHistoryQueryDto, {})).toEqual([]);
    expect(await invalid(GalpiHistoryQueryDto, { before: 'x'.repeat(64) })).toEqual([]);
    expect(await invalid(GalpiHistoryQueryDto, { before: 'x'.repeat(65) })).toEqual(['before']);
    expect(await invalid(GalpiHistoryQueryDto, { before: ['a', 'b'] })).toEqual(['before']);
    expect(await invalid(GalpiHistoryQueryDto, { cursor: 'm1' })).toEqual(['cursor']);
  });

  it('버튼 답의 key 는 32자까지고 꼭 있어야 한다', async () => {
    expect(await invalid(AnswerQuickReplyDto, { key: 'k'.repeat(32) })).toEqual([]);
    expect(await invalid(AnswerQuickReplyDto, { key: 'k'.repeat(33) })).toEqual(['key']);
    expect(await invalid(AnswerQuickReplyDto, {})).toEqual(['key']);
    expect(await invalid(AnswerQuickReplyDto, { key: 'allow', value: '회사' })).toEqual(['value']);
  });

  it('푸시 토큰은 두 가지 접두사만 받고, 모양이 조금이라도 다르면 거절한다', async () => {
    expect(await invalid(PushTokenDto, { token: 'ExpoPushToken[xyz]' })).toEqual([]);
    for (const token of [
      'ExponentPushToken[]',
      'ExponentPushToken[a b]',
      'ExponentPushToken[a]x',
      ' ExponentPushToken[a]',
      'ExponentPushToken[a]\n', // 줄바꿈이 로그나 DB 로 따라 들어가지 않게
      'exponentpushtoken[a]',
      'ExponentPushToken',
      '',
    ]) {
      expect(await invalid(PushTokenDto, { token }), JSON.stringify(token)).toEqual(['token']);
    }
    expect(await invalid(PushTokenDto, {})).toEqual(['token']);
    expect(await invalid(PushTokenDto, { token: 5 })).toEqual(['token']);
    expect(await invalid(PushTokenDto, { token: 'ExponentPushToken[a]', userId: 'u2' })).toEqual(['userId']);
    expect(EXPO_PUSH_TOKEN.test('ExponentPushToken[AbC123_-x]')).toBe(true);
  });
});
