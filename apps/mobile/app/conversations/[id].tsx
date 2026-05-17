import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ApiError,
  api,
  type ContactExchangeView,
  type ConversationDetail,
  type MessageView,
} from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';
import { decodeUserId, supabase } from '../../lib/supabase';

/**
 * G02 — 대화방
 *
 * 메시지 INSERT 는 NestJS API 경유 (검증).
 * 메시지 수신은 Supabase Realtime 직접 구독 (CLAUDE.md 패턴 3).
 *
 * 백업: 화면 진입 시 초기 로드 한 번 (Realtime 끊김 대비).
 */

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // 연락처 교환
  const [exchanges, setExchanges] = useState<ContactExchangeView[]>([]);
  const [contactPanel, setContactPanel] = useState<'closed' | 'request' | 'respond'>('closed');
  const [contactType, setContactType] = useState<'phone' | 'kakao'>('phone');
  const [contactValue, setContactValue] = useState('');
  const [contactBusy, setContactBusy] = useState(false);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const load = useCallback(async () => {
    const token = tokenRef.current ?? (await authStorage.getAccessToken());
    tokenRef.current = token;
    if (!token) {
      router.replace('/a03-login');
      return;
    }
    userIdRef.current = decodeUserId(token);
    try {
      const [detail, exchangeList] = await Promise.all([
        api.getConversation(token, id),
        api.listContactExchanges(token, id).catch(() => [] as ContactExchangeView[]),
      ]);
      setData(detail);
      setMessages(detail.messages);
      setExchanges(exchangeList);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await authStorage.clear();
        router.replace('/a03-login');
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // 초기 로드
  useEffect(() => {
    void load();
  }, [load]);

  // Supabase Realtime 구독 — messages 테이블 INSERT (이 대화방만)
  useEffect(() => {
    const token = tokenRef.current;
    if (!token) return;
    supabase.realtime.setAuth(token);

    const myId = userIdRef.current;
    const channel = supabase
      .channel(`conv:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            sender_id: string | null;
            message_type: MessageView['messageType'];
            content: string;
            created_at: string;
            deleted_at: string | null;
          };
          if (row.deleted_at) return;
          const isMine = !!myId && row.sender_id === myId;
          const msg: MessageView = {
            id: row.id,
            senderId: row.sender_id,
            messageType: row.message_type,
            content: row.content,
            isMine,
            createdAt: row.created_at,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, data]);

  const pendingExchange = exchanges.find((e) => e.status === 'requested');
  const isResponder = pendingExchange && !pendingExchange.isRequester;
  const canRequestExchange = data?.status === 'active' && !pendingExchange;

  async function reloadExchanges() {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const list = await api.listContactExchanges(token, id);
      setExchanges(list);
    } catch {
      // ignore
    }
  }

  async function onRequestContact() {
    const token = tokenRef.current;
    if (!token) return;
    if (!contactValue.trim()) {
      notify('입력 필요', '연락처를 입력해 주세요.');
      return;
    }
    setContactBusy(true);
    try {
      await api.requestContactExchange(token, id, contactType, contactValue.trim());
      setContactValue('');
      setContactPanel('closed');
      await Promise.all([load(), reloadExchanges()]);
    } catch (e) {
      if (e instanceof ApiError) notify(`오류 (${e.code})`, e.message);
      else notify('오류', e instanceof Error ? e.message : String(e));
    } finally {
      setContactBusy(false);
    }
  }

  async function onRespondContact(accepted: boolean) {
    const token = tokenRef.current;
    if (!token || !pendingExchange) return;
    if (accepted && !contactValue.trim()) {
      notify('입력 필요', '내 연락처도 입력해 주세요.');
      return;
    }
    setContactBusy(true);
    try {
      await api.respondContactExchange(
        token,
        pendingExchange.id,
        accepted,
        accepted ? contactValue.trim() : undefined,
      );
      setContactValue('');
      setContactPanel('closed');
      await Promise.all([load(), reloadExchanges()]);
    } catch (e) {
      if (e instanceof ApiError) notify(`오류 (${e.code})`, e.message);
      else notify('오류', e instanceof Error ? e.message : String(e));
    } finally {
      setContactBusy(false);
    }
  }

  async function onReportOrBlock(kind: 'report' | 'block') {
    const token = tokenRef.current;
    if (!token || !data) return;
    const peerId = data.peer.userId;
    if (kind === 'block') {
      const ok =
        Platform.OS === 'web'
          ? window.confirm('이 사용자를 차단할까요?\n차단하면 대화가 종료되고 추천에서 제외됩니다.')
          : await new Promise<boolean>((resolve) => {
              Alert.alert(
                '차단',
                '이 사용자를 차단할까요?\n차단하면 대화가 종료되고 추천에서 제외됩니다.',
                [
                  { text: '취소', style: 'cancel', onPress: () => resolve(false) },
                  { text: '차단', style: 'destructive', onPress: () => resolve(true) },
                ],
              );
            });
      if (!ok) return;
      try {
        await api.createBlock(token, peerId);
        notify('차단됨', '대화가 종료되었어요.');
        router.replace('/home');
      } catch (e) {
        if (e instanceof ApiError) notify(`오류 (${e.code})`, e.message);
        else notify('오류', e instanceof Error ? e.message : String(e));
      }
      return;
    }
    // report
    router.push({
      pathname: '/report',
      params: { targetUserId: peerId, conversationId: id },
    });
  }

  async function onSend() {
    const content = input.trim();
    if (!content || sending) return;
    const token = tokenRef.current;
    if (!token) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(token, id, content);
      // Realtime 구독이 같은 메시지를 다시 받을 수 있으므로 dedupe by id 처리됨
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setInput('');
    } catch (e) {
      if (e instanceof ApiError) notify(`오류 (${e.code})`, e.message);
      else notify('오류', e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#C00' }}>{error ?? '대화방을 찾을 수 없습니다.'}</Text>
        <Pressable onPress={() => router.back()} style={styles.linkButton}>
          <Text style={styles.linkText}>뒤로</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        {data.peer.mainPhotoUrl && (
          <Image source={{ uri: data.peer.mainPhotoUrl }} style={styles.headerPhoto} />
        )}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {data.peer.region1}
            {data.peer.jobCategory ? ` · ${data.peer.jobCategory}` : ''}
          </Text>
          <Text style={styles.headerSubtitle}>
            {data.status === 'active' ? `${data.daysLeft}일 남음` : '대화 종료됨'}
          </Text>
        </View>
        <Pressable style={styles.headerAction} onPress={() => onReportOrBlock('report')}>
          <Text style={styles.headerActionText}>신고</Text>
        </Pressable>
        <Pressable style={styles.headerAction} onPress={() => onReportOrBlock('block')}>
          <Text style={[styles.headerActionText, { color: '#C00' }]}>차단</Text>
        </Pressable>
      </View>

      {/* 연락처 교환 배너/패널 */}
      {pendingExchange && isResponder && contactPanel === 'closed' && (
        <View style={styles.exchangeBanner}>
          <Text style={styles.exchangeBannerText}>
            상대가 연락처 교환을 요청했어요 (
            {pendingExchange.contactType === 'phone' ? '휴대폰' : '카카오톡 ID'})
          </Text>
          <View style={styles.exchangeBannerRow}>
            <Pressable
              style={[styles.exchangeBtn, styles.exchangeDecline]}
              disabled={contactBusy}
              onPress={() => onRespondContact(false)}
            >
              <Text style={styles.exchangeBtnText}>거절</Text>
            </Pressable>
            <Pressable
              style={[styles.exchangeBtn, styles.exchangeAccept]}
              disabled={contactBusy}
              onPress={() => {
                setContactType(pendingExchange.contactType);
                setContactPanel('respond');
              }}
            >
              <Text style={[styles.exchangeBtnText, { color: '#FFF' }]}>동의 + 내 연락처 입력</Text>
            </Pressable>
          </View>
        </View>
      )}
      {pendingExchange && !isResponder && (
        <View style={styles.exchangeBanner}>
          <Text style={styles.exchangeBannerText}>내가 보낸 연락처 교환 요청 — 응답 대기 중</Text>
        </View>
      )}

      {(contactPanel === 'request' || contactPanel === 'respond') && (
        <View style={styles.contactPanel}>
          <Text style={styles.contactPanelTitle}>
            {contactPanel === 'request' ? '연락처 교환 요청' : '연락처 입력 후 동의'}
          </Text>
          {contactPanel === 'request' && (
            <View style={styles.contactTypeRow}>
              {(['phone', 'kakao'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeBtn, contactType === t && styles.typeBtnActive]}
                  onPress={() => setContactType(t)}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      contactType === t && styles.typeBtnTextActive,
                    ]}
                  >
                    {t === 'phone' ? '휴대폰' : '카카오톡 ID'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            style={styles.contactInput}
            value={contactValue}
            onChangeText={setContactValue}
            placeholder={contactType === 'phone' ? '01012345678' : '카카오ID'}
            autoCapitalize="none"
            keyboardType={contactType === 'phone' ? 'phone-pad' : 'default'}
          />
          <View style={styles.contactPanelActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setContactPanel('closed')}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, contactBusy && styles.disabled]}
              disabled={contactBusy}
              onPress={() => {
                if (contactPanel === 'request') void onRequestContact();
                else void onRespondContact(true);
              }}
            >
              {contactBusy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmBtnText}>
                  {contactPanel === 'request' ? '요청 보내기' : '동의'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {canRequestExchange && contactPanel === 'closed' && (
        <Pressable
          style={styles.requestContactButton}
          onPress={() => setContactPanel('request')}
        >
          <Text style={styles.requestContactText}>＋ 연락처 교환 요청</Text>
        </Pressable>
      )}

      {/* 메시지 목록 */}
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => {
          if (item.messageType.startsWith('system')) {
            return (
              <View style={styles.systemMessage}>
                <Text style={styles.systemText}>{item.content}</Text>
              </View>
            );
          }
          return (
            <View
              style={[
                styles.bubbleRow,
                item.isMine ? styles.bubbleRowMine : styles.bubbleRowPeer,
              ]}
            >
              <View
                style={[styles.bubble, item.isMine ? styles.bubbleMine : styles.bubblePeer]}
              >
                <Text style={item.isMine ? styles.bubbleTextMine : styles.bubbleTextPeer}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* 입력 */}
      {data.status === 'active' ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="메시지를 입력하세요"
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[styles.sendButton, (!input.trim() || sending) && styles.disabled]}
            disabled={!input.trim() || sending}
            onPress={onSend}
          >
            {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendText}>전송</Text>}
          </Pressable>
        </View>
      ) : (
        <View style={styles.expiredBox}>
          <Text style={styles.expiredText}>대화 기간이 만료되었어요</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  linkButton: { padding: 12 },
  linkText: { color: '#1A1A1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  back: { fontSize: 28, color: '#666', marginRight: 8 },
  headerPhoto: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 11, color: '#666', marginTop: 2 },
  messages: { padding: 12 },
  systemMessage: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  systemText: { fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 18 },
  bubbleRow: { marginVertical: 3 },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubbleRowPeer: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  bubbleMine: { backgroundColor: '#1A1A1A' },
  bubblePeer: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA' },
  bubbleTextMine: { color: '#FFF', fontSize: 14, lineHeight: 20 },
  bubbleTextPeer: { color: '#1A1A1A', fontSize: 14, lineHeight: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFF',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 8,
  },
  sendText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  expiredBox: { padding: 16, alignItems: 'center', backgroundColor: '#FFF' },
  expiredText: { color: '#999', fontSize: 13 },
  headerAction: { paddingHorizontal: 6, paddingVertical: 4 },
  headerActionText: { fontSize: 11, color: '#666' },
  exchangeBanner: {
    backgroundColor: '#FFF7E6',
    borderBottomWidth: 1,
    borderColor: '#F0D88A',
    padding: 10,
  },
  exchangeBannerText: { fontSize: 12, color: '#7A5A00', marginBottom: 6 },
  exchangeBannerRow: { flexDirection: 'row', gap: 6 },
  exchangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  exchangeAccept: { backgroundColor: '#1A1A1A' },
  exchangeDecline: { backgroundColor: '#EEE' },
  exchangeBtnText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  contactPanel: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#EAEAEA',
  },
  contactPanelTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  contactTypeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  typeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  typeBtnActive: { borderColor: '#1A1A1A', backgroundColor: '#1A1A1A' },
  typeBtnText: { fontSize: 12, color: '#555' },
  typeBtnTextActive: { color: '#FFF', fontWeight: '600' },
  contactInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    backgroundColor: '#FFF',
  },
  contactPanelActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#333', fontSize: 13 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
  },
  confirmBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  requestContactButton: {
    margin: 8,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  requestContactText: { fontSize: 12, color: '#555' },
});
