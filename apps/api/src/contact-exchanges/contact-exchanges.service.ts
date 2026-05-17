import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '@prologue/shared';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestContactDto } from './dto/request-contact.dto';
import type { RespondContactDto } from './dto/respond-contact.dto';

export interface ContactExchangeView {
  id: string;
  status: string;
  contactType: string;
  requesterId: string;
  responderId: string;
  isRequester: boolean;
  requestedAt: Date;
  respondedAt: Date | null;
}

/**
 * @fr FR-G05 연락처 교환 요청
 * @fr FR-G06 연락처 교환 동의/거절
 *
 * 흐름:
 * - request: 요청자가 자기 연락처를 입력. ContactExchange row 에 임시 보관.
 *   conversation 에 system_contact 메시지로 요청 알림 (실 연락처는 메시지에 포함 안 됨).
 * - respond accepted: 응답자가 자기 연락처 입력 →
 *   양쪽 평문이 들어간 system_contact 메시지 1회 노출 (FR-G06).
 *   ContactExchange row 의 양쪽 컬럼은 마스킹된 형태로 갱신 (운영자 관점 보호).
 * - respond declined: 요청자의 임시 평문 폐기 + 거절 메시지.
 *
 * MVP 한계 (BACKLOG 후보): 요청 ~ 응답 사이 짧은 시간 동안 requesterContactMasked
 * 컬럼이 평문을 담는다. Phase 6 에서 Redis + 암호화로 분리 권장.
 */
@Injectable()
export class ContactExchangesService {
  private readonly logger = new Logger(ContactExchangesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async request(
    userId: string,
    conversationId: string,
    dto: RequestContactDto,
  ): Promise<ContactExchangeView> {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || (conv.userAId !== userId && conv.userBId !== userId)) {
      throw new AppException(
        ErrorCode.CONVERSATION_NOT_FOUND,
        '대화방을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (conv.status !== 'active') {
      throw new AppException(
        ErrorCode.CONVERSATION_EXPIRED,
        '진행 중인 대화방에서만 요청할 수 있어요.',
        HttpStatus.GONE,
      );
    }

    const pending = await this.prisma.contactExchange.findFirst({
      where: { conversationId, status: 'requested' },
    });
    if (pending) {
      throw new AppException(
        ErrorCode.CONTACT_REQUEST_PENDING,
        '이미 진행 중인 연락처 교환 요청이 있어요.',
        HttpStatus.CONFLICT,
      );
    }

    const responderId = conv.userAId === userId ? conv.userBId : conv.userAId;

    const exchange = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contactExchange.create({
        data: {
          conversationId,
          requesterId: userId,
          responderId,
          contactType: dto.contactType,
          status: 'requested',
          requesterContactMasked: dto.myContact, // 임시 평문 보관 (응답 직후 마스킹/삭제)
        },
      });
      await tx.message.create({
        data: {
          conversationId,
          senderId: null,
          messageType: 'system_contact',
          content:
            `상대가 연락처 교환을 요청했어요 (${dto.contactType === 'phone' ? '휴대폰' : '카카오톡 ID'}).\n` +
            '동의하면 두 분의 연락처가 이 대화방에 한 번 공개됩니다.',
        },
      });
      return created;
    });

    this.logger.log(`contact exchange requested: ${exchange.id}`);
    return this.toView(exchange, userId);
  }

  async respond(
    userId: string,
    exchangeId: string,
    dto: RespondContactDto,
  ): Promise<ContactExchangeView> {
    const exchange = await this.prisma.contactExchange.findUnique({ where: { id: exchangeId } });
    if (!exchange) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        '연락처 교환 요청을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (exchange.responderId !== userId) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        '요청자만 응답할 수 있습니다.',
        HttpStatus.FORBIDDEN,
      );
    }
    if (exchange.status !== 'requested') {
      throw new AppException(
        ErrorCode.CONTACT_ALREADY_RESPONDED,
        '이미 응답된 요청입니다.',
        HttpStatus.CONFLICT,
      );
    }

    if (dto.accepted) {
      if (!dto.myContact) {
        throw new AppException(
          ErrorCode.CONTACT_REQUIRED,
          '동의 시 내 연락처도 입력해 주세요.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const requesterPlain = exchange.requesterContactMasked ?? '비공개';
      const responderPlain = dto.myContact;
      const masked = (s: string) => maskContact(s, exchange.contactType);

      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedRow = await tx.contactExchange.update({
          where: { id: exchangeId },
          data: {
            status: 'accepted',
            respondedAt: new Date(),
            requesterContactMasked: masked(requesterPlain),
            responderContactMasked: masked(responderPlain),
          },
        });
        await tx.message.create({
          data: {
            conversationId: exchange.conversationId,
            senderId: null,
            messageType: 'system_contact',
            content:
              '연락처가 공개되었어요.\n' +
              `· 요청자: ${requesterPlain}\n` +
              `· 응답자: ${responderPlain}\n` +
              '대화방 외부에서 안전하고 존중하는 만남을 부탁드려요.',
          },
        });
        return updatedRow;
      });

      return this.toView(updated, userId);
    }

    // declined
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedRow = await tx.contactExchange.update({
        where: { id: exchangeId },
        data: {
          status: 'declined',
          respondedAt: new Date(),
          requesterContactMasked: null, // 임시 평문 폐기
        },
      });
      await tx.message.create({
        data: {
          conversationId: exchange.conversationId,
          senderId: null,
          messageType: 'system_contact',
          content: '연락처 교환 요청이 거절되었어요.',
        },
      });
      return updatedRow;
    });

    return this.toView(updated, userId);
  }

  async listForConversation(
    userId: string,
    conversationId: string,
  ): Promise<ContactExchangeView[]> {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || (conv.userAId !== userId && conv.userBId !== userId)) {
      throw new AppException(
        ErrorCode.CONVERSATION_NOT_FOUND,
        '대화방을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    const rows = await this.prisma.contactExchange.findMany({
      where: { conversationId },
      orderBy: { requestedAt: 'desc' },
    });
    return rows.map((r) => this.toView(r, userId));
  }

  private toView(
    row: {
      id: string;
      status: string;
      contactType: string;
      requesterId: string;
      responderId: string;
      requestedAt: Date;
      respondedAt: Date | null;
    },
    userId: string,
  ): ContactExchangeView {
    return {
      id: row.id,
      status: row.status,
      contactType: row.contactType,
      requesterId: row.requesterId,
      responderId: row.responderId,
      isRequester: row.requesterId === userId,
      requestedAt: row.requestedAt,
      respondedAt: row.respondedAt,
    };
  }
}

function maskContact(plain: string, type: string): string {
  if (type === 'phone') {
    const digits = plain.replace(/\D/g, '');
    if (digits.length <= 4) return '*'.repeat(digits.length);
    return digits.slice(0, digits.length - 4) + '****';
  }
  // kakao 등 비휴대폰: 앞 2자 외 마스킹
  if (plain.length <= 2) return '*'.repeat(plain.length);
  return plain.slice(0, 2) + '*'.repeat(plain.length - 2);
}
