#!/usr/bin/env bash
# FR-E 통합 검증: 관심 보내기 + 양방향 → Match 자동 생성
set -e
BASE=http://localhost:3001/api/v1

node -e "require('fs').writeFileSync('_test.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=','base64'))"

extract() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log($1)}catch{console.log('')}})"
}

signup() {
  local sid=$(curl -s -X POST "$BASE/auth/identity/start" | extract 'JSON.parse(d).data.sessionId')
  curl -s -X POST "$BASE/auth/identity/complete" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"$sid\",\"callbackToken\":\"{\\\"phoneNumber\\\":\\\"$2\\\",\\\"name\\\":\\\"$1\\\",\\\"birthYear\\\":$3,\\\"gender\\\":\\\"$4\\\"}\",\"consents\":[{\"type\":\"tos\",\"required\":true,\"agreed\":true,\"version\":\"v1\"},{\"type\":\"privacy\",\"required\":true,\"agreed\":true,\"version\":\"v1\"}]}" \
    | extract 'JSON.parse(d).data.accessToken'
}

M=$(signup "추천남자" "+821055556700" 1990 "male")
F=$(signup "추천여자" "+821055556711" 1992 "female")
echo "토큰 확보"
echo ""

echo "=== M 의 추천 목록 ==="
M_REC=$(curl -s -H "Authorization: Bearer $M" "$BASE/me/recommendations" | extract 'JSON.parse(d).data[0]?.id')
echo "M's first rec: ${M_REC:0:30}..."
echo ""

echo "=== 1) M 이 관심 보내기 (일방향) → isMutualMatch=false 기대 ==="
curl -s -X POST "$BASE/recommendations/$M_REC/interest" -H "Authorization: Bearer $M" | extract 'JSON.stringify(JSON.parse(d).data)'
echo ""

echo "=== 2) M 의 보낸 관심 목록 → isMatched=false ==="
curl -s -H "Authorization: Bearer $M" "$BASE/me/interests/sent" | extract 'JSON.parse(d).data.map(i => `count=${JSON.parse(d).data.length} target=${i.target.userId.slice(0,8)} matched=${i.target.isMatched}`).join("\\n")'
echo ""

echo "=== 3) F 가 M 에게도 관심 → 양방향 → Match 자동 생성 기대 ==="
F_REC=$(curl -s -H "Authorization: Bearer $F" "$BASE/me/recommendations" | extract 'JSON.parse(d).data[0]?.id')
echo "F's first rec: ${F_REC:0:30}..."
curl -s -X POST "$BASE/recommendations/$F_REC/interest" -H "Authorization: Bearer $F" | extract 'JSON.stringify(JSON.parse(d).data)'
echo ""

echo "=== 4) M 의 보낸 관심 다시 → isMatched=true 기대 ==="
curl -s -H "Authorization: Bearer $M" "$BASE/me/interests/sent" | extract 'JSON.parse(d).data.map(i => `target=${i.target.userId.slice(0,8)} matched=${i.target.isMatched}`).join("\\n")'
echo ""

echo "=== 5) M 이 이미 관심 보낸 추천에 또 보내기 → 409 ==="
curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/recommendations/$M_REC/interest" -H "Authorization: Bearer $M"

rm -f _test.png
