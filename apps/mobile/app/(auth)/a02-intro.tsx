import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../components/AppText';
import { Button, Screen } from '../../components/ui';
import { SPACE } from '../../theme/tokens';
import { useTheme } from '../../theme/use-theme';

// Approved copy and artwork from the reviewed onboarding screens.
const PAGES = [
  {
    title: '프롤로그는 프로필을\n진열하지 않아요',
    body: '프롤로그에서는 소개받는 한 사람에게만\n내 프로필이 편지로 전해져요.',
    image: require('../../../../docs/previews/onboarding/intro-envelope.png'),
    imageLabel: '살짝 열린 봉투 속 크림색 편지 한 장',
  },
  {
    title: '갈피는 대화 속에서\n나를 알아가요',
    body: '나를 잘 아는 친구에게 소개팅을 받듯이,\nAI 친구 갈피가 내 이야기를 듣고\n잘 맞을 만한 사람을 소개해요.',
    image: require('../../../../docs/previews/onboarding/intro-2.png'),
    imageLabel: '고개를 기울여 이야기를 듣는 갈피',
  },
  {
    title: '잘 맞을 사람이 떠오르면\n편지가 도착해요',
    body: '갈피가 두 사람을\n소개하고 싶은 이유를 적어요.\n프로필과 편지는 소개 상대에게만 전해지고,\n두 사람 모두 수락하면 대화가 열려요.',
    image: require('../../../../docs/previews/onboarding/intro-3.png'),
    imageLabel: '봉투에서 꺼내 펼친 크림색 편지',
  },
  {
    title: '만나고 난 뒤에도\n갈피와 이야기해요',
    body: '편했던 순간도, 아쉬웠던 점도\n갈피에게만 들려줄 수 있어요.\n다음 소개에는 내가\n반영하고 싶은 점만 담아요.',
    image: require('../../../../docs/previews/onboarding/intro-4.png'),
    imageLabel: '외투가 걸린 의자 옆에 앉아 있는 갈피',
  },
] as const;

export default function A02Intro() {
  const router = useRouter();
  const t = useTheme();
  const { height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const pageRef = useRef(0);
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const last = page === PAGES.length - 1;
  const imageSize = height < 700 ? 120 : 152;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (width) scroll.current?.scrollTo({ x: pageRef.current * width, animated: false });
  }, [width]);

  const start = () => router.push({ pathname: '/a03-login', params: { mode: 'signup' } });
  const next = () => {
    if (last) {
      start();
      return;
    }
    const index = Math.min(PAGES.length - 1, pageRef.current + 1);
    scroll.current?.scrollTo({ x: index * width, animated: !reduceMotion });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.container} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <View style={styles.header}>
          <Image
            source={require('../../assets/brand/prologue-wordmark-friendly.png')}
            accessibilityLabel="Prologue"
            contentFit="contain"
            style={styles.brand}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/a03-login', params: { mode: 'login' } })}
            style={styles.login}
          >
            <Text style={[styles.loginText, { color: t.sub }]}>로그인</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.pager}
          contentContainerStyle={styles.pages}
          scrollEnabled={width > 0}
          scrollEventThrottle={16}
          onScroll={(event) => {
            if (!width) return;
            const index = Math.max(0, Math.min(PAGES.length - 1, Math.round(event.nativeEvent.contentOffset.x / width)));
            if (index === pageRef.current) return;
            pageRef.current = index;
            setPage(index);
          }}
        >
          {PAGES.map((item, index) => (
            <ScrollView
              key={item.title}
              style={[styles.slide, { width }]}
              contentContainerStyle={styles.page}
              showsVerticalScrollIndicator={false}
              accessibilityElementsHidden={index !== page}
              aria-hidden={index !== page}
              importantForAccessibility={index === page ? 'auto' : 'no-hide-descendants'}
            >
              <Image source={item.image} accessibilityLabel={item.imageLabel} contentFit="contain" style={{ width: imageSize, height: imageSize }} />
              <Text accessibilityRole="header" style={[styles.title, { color: t.ink }]}>{item.title}</Text>
              <Text style={[styles.body, { color: t.sub }]}>{item.body}</Text>
              {index > 0 && (
                <Text style={[styles.privacy, { color: t.sub }]}>내 프로필은 소개 편지를 받는 상대에게만 보여요.</Text>
              )}
              <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel="서비스 소개"
                aria-valuemin={1}
                aria-valuemax={PAGES.length}
                aria-valuenow={index + 1}
                aria-valuetext={`전체 ${PAGES.length}장 중 ${index + 1}번째`}
                style={styles.indicator}
              >
                {PAGES.map((step, stepIndex) => (
                  <View key={step.title} style={[styles.dot, { borderColor: t.sub }, stepIndex === index && { backgroundColor: t.sub }]} />
                ))}
              </View>
            </ScrollView>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}><Button label={last ? '시작하기' : '다음'} onPress={next} /></View>
          <View style={styles.skipSlot}>
            {!last ? (
              <Pressable accessibilityRole="button" onPress={start} style={styles.skip}>
                <Text style={[styles.skipText, { color: t.sub }]}>건너뛰고 시작하기</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.xl, paddingTop: SPACE.s },
  brand: { width: 96, height: 26 },
  login: { minHeight: 44, justifyContent: 'center', paddingLeft: SPACE.m },
  loginText: { fontSize: 14 },
  pager: { flex: 1 },
  pages: { flexGrow: 1 },
  slide: { flexGrow: 0, flexShrink: 0, height: '100%' },
  page: { flexGrow: 1, paddingHorizontal: SPACE.xl, paddingVertical: SPACE.m, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: SPACE.l, marginBottom: SPACE.m, fontSize: 26, fontWeight: '700', lineHeight: 35, textAlign: 'center', letterSpacing: -1 },
  body: { fontSize: 15, lineHeight: 25, textAlign: 'center', maxWidth: 350 },
  footer: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.s },
  indicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACE.s, minHeight: 16, marginTop: SPACE.l },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
  privacy: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: SPACE.m },
  buttonRow: { flexDirection: 'row' },
  skipSlot: { height: 44 },
  skip: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 13 },
});
