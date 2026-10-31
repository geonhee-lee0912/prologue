/**
 * 개발용 시드 — 디자인/UX 리뷰를 위한 깨끗한 한글 테스트 데이터.
 *
 * 실행: pnpm --filter api db:seed   (tsx prisma/seed.ts)
 *
 * 구성:
 *  - 뷰어(여, 서울) : 온보딩 완료. 로그인해서 리뷰하는 계정.
 *  - 대화 상대(남)  : 뷰어와 매칭 + 활성 대화 + 메시지.
 *  - 추천 후보 3명  : 자격(인증/서약/설문) 충족 → 홈에서 추천 카드 자동 생성.
 *  - 관심 보낸 상대 : 뷰어가 send_interest → 관심 탭 노출.
 *
 * 고정 UUID 사용 → 재실행 시 해당 유저만 삭제 후 재생성 (멱등).
 * 사진은 Supabase Storage 실체가 없으므로 생략(뷰어만 main photo 레코드 — 온보딩 완료 조건).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VIEWER = '11111111-1111-4111-8111-111111111111';
const PARTNER = '22222222-2222-4222-8222-222222222222';
const CAND1 = '33333333-3333-4333-8333-333333333333';
const CAND2 = '44444444-4444-4444-8444-444444444444';
const CAND3 = '55555555-5555-4555-8555-555555555555';
const INTEREST = '66666666-6666-4666-8666-666666666666';

const ALL_IDS = [VIEWER, PARTNER, CAND1, CAND2, CAND3, INTEREST];

const DAY = 24 * 60 * 60 * 1000;

async function makeUser(opts: {
  id: string;
  gender: 'male' | 'female';
  birthYear: number;
  region1: string;
  region2: string;
  jobCategory: string;
  bookTitle?: string;
  intro: string;
  lifestyleTags: string[];
  intent:
    | 'serious_long_term'
    | 'natural_dating'
    | 'open_to_marriage'
    | 'casual_meeting'
    | 'friendship_first';
  pace: 'slow' | 'moderate' | 'fast';
  contactFrequency: 'low' | 'medium' | 'high';
  withMainPhoto?: boolean;
  photoUrl?: string; // 지정 시 storageKey 대신 외부 URL (개발 프리뷰용)
}) {
  const targetGender = opts.gender === 'male' ? 'female' : 'male';
  await prisma.user.create({
    data: {
      id: opts.id,
      phoneHash: `seed-phone-${opts.id}`,
      loginProvider: 'phone',
      gender: opts.gender,
      birthYear: opts.birthYear,
      targetGender,
      region1: opts.region1,
      region2: opts.region2,
      status: 'active',
      membershipType: 'free',
      auth: {
        create: {
          identityVerified: true,
          identityVerifiedAt: new Date(),
          identityProvider: 'mock',
          faceMatchStatus: 'verified',
          faceVerifiedAt: new Date(),
          faceConfidence: 0.98,
          ageVerified: true,
          mannerPledgeAgreed: true,
          mannerPledgeAgreedAt: new Date(),
          singlePledgeAgreed: true,
          singlePledgeAgreedAt: new Date(),
        },
      },
      profile: {
        create: {
          jobCategory: opts.jobCategory,
          bookTitle: opts.bookTitle,
          intro: opts.intro,
          lifestyleTags: opts.lifestyleTags,
          reviewStatus: 'approved',
          completionScore: 90,
        },
      },
      relationshipPreference: {
        create: {
          intent: opts.intent,
          pace: opts.pace,
          contactFrequency: opts.contactFrequency,
        },
      },
      ...(opts.withMainPhoto
        ? {
            photos: {
              create: {
                photoType: 'main',
                storageKey: opts.photoUrl ?? `seed/${opts.id}/main.jpg`,
                isMain: true,
                reviewStatus: 'approved',
                faceMatchStatus: 'verified',
              },
            },
          }
        : {}),
    },
  });
}

async function main() {
  // --- 멱등: 기존 시드 유저 삭제 (cascade 로 자식 레코드 정리) ---
  await prisma.user.deleteMany({ where: { id: { in: ALL_IDS } } });

  // --- 뷰어 (여, 서울 강남, 마케터) ---
  await makeUser({
    id: VIEWER,
    gender: 'female',
    birthYear: 1993,
    region1: '서울',
    region2: '강남구',
    jobCategory: '마케팅/브랜드',
    intro:
      '평일에는 브랜드 마케터로 일하고, 주말에는 동네 책방을 돌아다니며 에세이를 읽어요. 차분하게 대화를 쌓아가는 사람을 만나고 싶어요.',
    lifestyleTags: ['독서', '카페투어', '러닝', '전시관람'],
    intent: 'serious_long_term',
    pace: 'moderate',
    contactFrequency: 'medium',
    withMainPhoto: true,
  });

  // --- 대화 상대 (남, 서울 마포, 프로덕트 디자이너) ---
  await makeUser({
    id: PARTNER,
    gender: 'male',
    birthYear: 1991,
    region1: '서울',
    region2: '마포구',
    jobCategory: '디자인',
    intro:
      '프로덕트 디자이너로 일하고 있어요. 좋은 질문을 던지는 대화를 좋아하고, 주말엔 자전거를 타거나 사진을 찍습니다. 서두르지 않고 천천히 알아가고 싶어요.',
    lifestyleTags: ['자전거', '사진', '영화', '요리'],
    intent: 'serious_long_term',
    pace: 'slow',
    contactFrequency: 'medium',
  });

  // --- 추천 후보 3명 ---
  await makeUser({
    id: CAND1,
    gender: 'male',
    birthYear: 1990,
    region1: '서울',
    region2: '용산구',
    jobCategory: '개발/엔지니어링',
    intro:
      '백엔드 개발자예요. 평소엔 조용한 편인데, 관심 있는 주제가 나오면 이야기가 길어집니다. 등산과 위스키 한 잔을 좋아해요. 진지하게 관계를 생각하고 있어요.',
    lifestyleTags: ['등산', '위스키', '코딩', '팟캐스트'],
    bookTitle: '산 정상에서 마시는 위스키 한 잔',
    photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    withMainPhoto: true,
    intent: 'serious_long_term',
    pace: 'moderate',
    contactFrequency: 'medium',
  });
  await makeUser({
    id: CAND2,
    gender: 'male',
    birthYear: 1992,
    region1: '경기',
    region2: '성남시',
    jobCategory: '의료/제약',
    intro:
      '재활의학과에서 일하는 의사입니다. 사람 이야기를 듣는 걸 좋아해요. 주말엔 클래식 공연을 보러 가거나 집에서 베이킹을 합니다. 따뜻한 관계를 원해요.',
    lifestyleTags: ['클래식', '베이킹', '산책', '와인'],
    bookTitle: '일요일 아침엔 빵을 굽습니다',
    photoUrl: 'https://randomuser.me/api/portraits/men/45.jpg',
    withMainPhoto: true,
    intent: 'open_to_marriage',
    pace: 'slow',
    contactFrequency: 'high',
  });
  await makeUser({
    id: CAND3,
    gender: 'male',
    birthYear: 1989,
    region1: '서울',
    region2: '종로구',
    jobCategory: '법률',
    intro:
      '변호사로 일하고 있어요. 논리적이라는 말을 자주 듣지만 의외로 감성적인 영화를 좋아합니다. 미술관 가는 걸 즐기고, 좋은 대화 상대를 찾고 있어요.',
    lifestyleTags: ['미술관', '영화', '테니스', '여행'],
    bookTitle: '미술관에서 오래 머무는 사람',
    photoUrl: 'https://randomuser.me/api/portraits/men/12.jpg',
    withMainPhoto: true,
    intent: 'natural_dating',
    pace: 'moderate',
    contactFrequency: 'medium',
  });

  // --- 관심 보낸 상대 (남, 인천, 셰프) ---
  await makeUser({
    id: INTEREST,
    gender: 'male',
    birthYear: 1990,
    region1: '인천',
    region2: '연수구',
    jobCategory: '요식업',
    intro:
      '작은 비스트로를 운영하는 셰프예요. 제철 재료로 요리하는 걸 좋아하고, 쉬는 날엔 시장 구경을 다닙니다. 음식과 일상을 나눌 사람을 만나고 싶어요.',
    lifestyleTags: ['요리', '시장구경', '캠핑', '재즈'],
    bookTitle: '제철 재료로 차리는 저녁',
    photoUrl: 'https://randomuser.me/api/portraits/men/67.jpg',
    withMainPhoto: true,
    intent: 'serious_long_term',
    pace: 'moderate',
    contactFrequency: 'medium',
  });

  // --- 매칭 + 대화 (뷰어 <-> 대화상대) ---
  // userAId < userBId 정렬 (VIEWER '1...' < PARTNER '2...')
  const startedAt = new Date(Date.now() - 1 * DAY);
  const expiresAt = new Date(Date.now() + 6 * DAY);
  const match = await prisma.match.create({
    data: {
      userAId: VIEWER,
      userBId: PARTNER,
      status: 'active',
      matchedAt: startedAt,
      conversation: {
        create: {
          userAId: VIEWER,
          userBId: PARTNER,
          status: 'active',
          startedAt,
          expiresAt,
        },
      },
    },
    include: { conversation: true },
  });
  const convId = match.conversation!.id;

  const msgs: { senderId: string | null; type: any; content: string; offsetMin: number }[] = [
    {
      senderId: null,
      type: 'system_topic',
      content: '첫 대화를 시작해보세요. "요즘 가장 즐겁게 하는 일은 무엇인가요?"',
      offsetMin: 0,
    },
    { senderId: PARTNER, type: 'text', content: '안녕하세요! 프로필 잘 봤어요. 책방 다니신다는 게 인상적이었어요.', offsetMin: 30 },
    { senderId: VIEWER, type: 'text', content: '안녕하세요 :) 반가워요. 디자이너시라니, 좋아하시는 전시 있으면 추천해주세요!', offsetMin: 95 },
    { senderId: PARTNER, type: 'text', content: '요즘 사진전 하나 인상 깊게 봤어요. 주말에 시간 되시면 같이 이야기 나눠요.', offsetMin: 140 },
    { senderId: VIEWER, type: 'text', content: '좋아요. 천천히 알아가요 우리 :)', offsetMin: 210 },
  ];
  for (const m of msgs) {
    await prisma.message.create({
      data: {
        conversationId: convId,
        senderId: m.senderId,
        messageType: m.type,
        content: m.content,
        createdAt: new Date(startedAt.getTime() + m.offsetMin * 60 * 1000),
      },
    });
  }

  // --- 관심 보내기 (뷰어 -> INTEREST) → 관심 탭 ---
  await prisma.userAction.create({
    data: {
      userId: VIEWER,
      targetUserId: INTEREST,
      actionType: 'send_interest',
    },
  });

  console.log('seed done.');
  console.log('VIEWER id (login as this):', VIEWER);
  console.log(`conversation ${convId} with ${msgs.length} messages`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
