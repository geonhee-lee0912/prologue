import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode, POLICY } from '@prologue/shared';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

export interface ConversationListItem {
  id: string;
  matchId: string;
  status: string;
  startedAt: Date;
  expiresAt: Date;
  daysLeft: number;
  peer: {
    userId: string;
    region1: string;
    region2: string | null;
    jobCategory: string | null;
    mainPhotoUrl: string | null;
  };
  lastMessage: {
    content: string;
    messageType: string;
    createdAt: Date;
  } | null;
}

export interface MessageView {
  id: string;
  senderId: string | null;
  messageType: string;
  content: string;
  isMine: boolean;
  createdAt: Date;
}

export interface ConversationDetail {
  id: string;
  matchId: string;
  status: string;
  startedAt: Date;
  expiresAt: Date;
  daysLeft: number;
  peer: ConversationListItem['peer'];
  messages: MessageView[];
}

const DEFAULT_DURATION_MS = POLICY.conversation.defaultDurationDays * 24 * 60 * 60 * 1000;

/**
 * @fr FR-G 대화방
 * @fr FR-F03 첫 대화 주제 (시스템 메시지)
 *
 * 매칭 시 Conversation 자동 생성 (createForMatch) 후
 * 본 서비스에서 조회/메시지 송신 담당.
 */
@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * 매칭 직후 Conversation + 환영 시스템 메시지 생성.
   * ActionsService 의 매칭 트랜잭션 안에서 호출됨.
   */
  async createForMatch(
    tx: Prisma.TransactionClient,
    matchId: string,
    userAId: string,
    userBId: string,
  ): Promise<string> {
    const now = new Date();
    const conversation = await tx.conversation.create({
      data: {
        matchId,
        userAId,
        userBId,
        status: 'active',
        startedAt: now,
        expiresAt: new Date(now.getTime() + DEFAULT_DURATION_MS),
      },
    });

    // 환영 + 첫 문장 안내 시스템 메시지
    await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: null,
        messageType: 'system_topic',
        content:
          '두 분이 모두 관심을 보내셨어요. 첫 문장을 자유롭게 시작해보세요.\n' +
          '서로 안전하고 존중하는 대화를 부탁드려요.',
      },
    });

    this.logger.log(`conversation ${conversation.id} created for match ${matchId}`);
    return conversation.id;
  }

  async listMyConversations(userId: string): Promise<ConversationListItem[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: { in: ['active', 'expired'] },
      },
      orderBy: { startedAt: 'desc' },
    });
    if (conversations.length === 0) return [];

    const peerIds = conversations.map((c) => (c.userAId === userId ? c.userBId : c.userAId));
    const [peers, mainPhotos, lastMessages] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: peerIds } },
        include: { profile: true },
      }),
      this.prisma.photo.findMany({
        where: { userId: { in: peerIds }, isMain: true, deletedAt: null },
      }),
      this.fetchLastMessages(conversations.map((c) => c.id)),
    ]);
    const peerMap = new Map(peers.map((p) => [p.id, p]));
    const photoMap = new Map(mainPhotos.map((p) => [p.userId, p]));

    const result: ConversationListItem[] = [];
    for (const c of conversations) {
      const peerId = c.userAId === userId ? c.userBId : c.userAId;
      const peer = peerMap.get(peerId);
      const photo = photoMap.get(peerId);
      const signedUrl = photo ? await this.signPhotoUrl(photo.storageKey) : null;
      const last = lastMessages.get(c.id) ?? null;

      result.push({
        id: c.id,
        matchId: c.matchId,
        status: c.status,
        startedAt: c.startedAt,
        expiresAt: c.expiresAt,
        daysLeft: this.daysLeft(c.expiresAt),
        peer: {
          userId: peerId,
          region1: peer?.region1 ?? '',
          region2: peer?.region2 ?? null,
          jobCategory: peer?.profile?.jobCategory ?? null,
          mainPhotoUrl: signedUrl,
        },
        lastMessage: last,
      });
    }
    return result;
  }

  async getConversation(userId: string, conversationId: string): Promise<ConversationDetail> {
    const c = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!c || (c.userAId !== userId && c.userBId !== userId)) {
      throw new AppException(
        ErrorCode.CONVERSATION_NOT_FOUND,
        '대화방을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    const peerId = c.userAId === userId ? c.userBId : c.userAId;
    const [peer, photo, messages] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: peerId }, include: { profile: true } }),
      this.prisma.photo.findFirst({
        where: { userId: peerId, isMain: true, deletedAt: null },
      }),
      this.prisma.message.findMany({
        where: { conversationId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const signedUrl = photo ? await this.signPhotoUrl(photo.storageKey) : null;

    return {
      id: c.id,
      matchId: c.matchId,
      status: c.status,
      startedAt: c.startedAt,
      expiresAt: c.expiresAt,
      daysLeft: this.daysLeft(c.expiresAt),
      peer: {
        userId: peerId,
        region1: peer?.region1 ?? '',
        region2: peer?.region2 ?? null,
        jobCategory: peer?.profile?.jobCategory ?? null,
        mainPhotoUrl: signedUrl,
      },
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        messageType: m.messageType,
        content: m.content,
        isMine: m.senderId === userId,
        createdAt: m.createdAt,
      })),
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
  ): Promise<MessageView> {
    const c = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!c || (c.userAId !== userId && c.userBId !== userId)) {
      throw new AppException(
        ErrorCode.CONVERSATION_NOT_FOUND,
        '대화방을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    // 만료 검증 — expiresAt 지났으면 자동 expired 처리 후 거부
    const now = new Date();
    if (c.expiresAt < now || c.status === 'expired') {
      if (c.status !== 'expired') {
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'expired', endedAt: now, endReason: 'duration_elapsed' },
        });
      }
      throw new AppException(
        ErrorCode.CONVERSATION_EXPIRED,
        '대화 기간이 만료되었습니다.',
        HttpStatus.GONE,
      );
    }
    if (c.status === 'blocked' || c.status === 'closed') {
      throw new AppException(
        ErrorCode.CONVERSATION_BLOCKED,
        '대화가 종료되었습니다.',
        HttpStatus.GONE,
      );
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        messageType: 'text',
        content,
      },
    });

    return {
      id: message.id,
      senderId: message.senderId,
      messageType: message.messageType,
      content: message.content,
      isMine: true,
      createdAt: message.createdAt,
    };
  }

  // ============================================================
  // helpers
  // ============================================================

  private async fetchLastMessages(
    conversationIds: string[],
  ): Promise<Map<string, { content: string; messageType: string; createdAt: Date }>> {
    if (conversationIds.length === 0) return new Map();
    // 각 대화방의 마지막 메시지 (deleted 제외)
    const all = await this.prisma.message.findMany({
      where: { conversationId: { in: conversationIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const map = new Map<string, { content: string; messageType: string; createdAt: Date }>();
    for (const m of all) {
      if (!map.has(m.conversationId)) {
        map.set(m.conversationId, {
          content: m.content,
          messageType: m.messageType,
          createdAt: m.createdAt,
        });
      }
    }
    return map;
  }

  private async signPhotoUrl(storageKey: string): Promise<string | null> {
    const { data } = await this.supabase.admin.storage
      .from('photos')
      .createSignedUrl(storageKey, 60 * 60);
    return data?.signedUrl ?? null;
  }

  private daysLeft(expiresAt: Date): number {
    const diff = expiresAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }
}
