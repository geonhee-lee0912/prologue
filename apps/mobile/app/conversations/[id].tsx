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
import { ApiError, api, type ConversationDetail, type MessageView } from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';

/**
 * G02 — 대화방
 *
 * MVP: 폴링 (5초). L2 에서 Supabase Realtime 구독으로 교체.
 */
const POLL_INTERVAL = 5_000;

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

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const load = useCallback(
    async (silent = false) => {
      const token = tokenRef.current ?? (await authStorage.getAccessToken());
      tokenRef.current = token;
      if (!token) {
        router.replace('/a03-login');
        return;
      }
      try {
        const detail = await api.getConversation(token, id);
        setData(detail);
        setMessages(detail.messages);
        setError(null);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await authStorage.clear();
          router.replace('/a03-login');
          return;
        }
        if (!silent) setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [id, router],
  );

  // 초기 로드 + 폴링
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load(true);
    }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [load]);

  async function onSend() {
    const content = input.trim();
    if (!content || sending) return;
    const token = tokenRef.current;
    if (!token) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(token, id, content);
      setMessages((prev) => [...prev, msg]);
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
      </View>

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
});
