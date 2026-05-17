#!/usr/bin/env bash
# 추천 시스템 통합 검증 (FR-D)
# 1. 두 사용자 (남/여) 가입 + 사진 + 얼굴 인증 + 프로필 완성
# 2. 남자 사용자로 /me/recommendations 호출
# 3. 여자 사용자가 추천되는지 확인

set -e
BASE=http://localhost:3001/api/v1

# 테스트 PNG (1x1 transparent)
node -e "require('fs').writeFileSync('_test.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=','base64'))"
PNG=_test.png

signup() {
  local name="$1" phone="$2" year="$3" gender="$4"
  local sid=$(curl -s -X POST "$BASE/auth/identity/start" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).data.sessionId))')
  curl -s -X POST "$BASE/auth/identity/complete" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"$sid\",\"callbackToken\":\"{\\\"phoneNumber\\\":\\\"$phone\\\",\\\"name\\\":\\\"$name\\\",\\\"birthYear\\\":$year,\\\"gender\\\":\\\"$gender\\\"}\",\"consents\":[{\"type\":\"terms_of_service\",\"required\":true,\"agreed\":true,\"version\":\"v1\"},{\"type\":\"privacy\",\"required\":true,\"agreed\":true,\"version\":\"v1\"}]}" \
    | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).data.accessToken))'
}

setup_user() {
  local token="$1" gender="$2"
  # 사진 업로드
  curl -s -X POST "$BASE/me/photos" -H "Authorization: Bearer $token" -F "file=@$PNG" > /dev/null
  # 얼굴 인증
  curl -s -X POST "$BASE/me/verification/face" -H "Authorization: Bearer $token" -F "selfie=@$PNG" > /dev/null
  # targetGender (반대 성별)
  local target="female"; [ "$gender" = "female" ] && target="male"
  # 프로필
  curl -s -X PATCH "$BASE/me/profile" \
    -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
    -d "{\"region1\":\"서울특별시\",\"region2\":\"강남구\",\"targetGender\":\"$target\",\"jobCategory\":\"IT/개발\",\"intro\":\"안녕하세요. 차분한 대화와 산책을 좋아합니다. 함께 천천히 알아가고 싶어요.\",\"lifestyleTags\":[\"독서\",\"러닝\",\"카페\"],\"answers\":[{\"category\":\"story\",\"questionKey\":\"work_career\",\"answer\":\"개발자로 5년 일하고 있어요\"},{\"category\":\"story\",\"questionKey\":\"weekend_rest\",\"answer\":\"주말엔 카페에서 책 읽어요\"},{\"category\":\"relationship\",\"questionKey\":\"contact_frequency\",\"answer\":\"적당히 자연스럽게\"},{\"category\":\"relationship\",\"questionKey\":\"conversation_style\",\"answer\":\"깊이 있는 대화 선호\"}],\"preference\":{\"intent\":\"serious_long_term\",\"pace\":\"moderate\",\"contactFrequency\":\"medium\"}}" > /dev/null
}

echo "=== Setup: 남자 + 여자 사용자 ==="
M_TOKEN=$(signup "추천남자" "+821055556700" 1990 "male")
F_TOKEN=$(signup "추천여자" "+821055556711" 1992 "female")
echo "  남자 토큰: ${M_TOKEN:0:30}..."
echo "  여자 토큰: ${F_TOKEN:0:30}..."

echo "=== 두 사용자 모두 사진 + 얼굴 + 프로필 완성 ==="
setup_user "$M_TOKEN" "male"
setup_user "$F_TOKEN" "female"
echo "  완료"

echo ""
echo "=== 남자 사용자가 GET /me/recommendations 호출 ==="
curl -s -H "Authorization: Bearer $M_TOKEN" "$BASE/me/recommendations" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const r=JSON.parse(d).data;console.log("추천 수:",r.length);r.forEach((c,i)=>{console.log(`\n[${i+1}] rank=${c.rank} status=${c.status}`);console.log("  target:", c.target.region1, c.target.profile?.jobCategory);console.log("  summary:", c.reason.summary);console.log("  matched:", c.reason.matchedPoints);console.log("  conversation:", c.reason.conversationTopics)})})'

rm -f "$PNG"
