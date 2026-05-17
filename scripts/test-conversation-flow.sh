#!/usr/bin/env bash
# FR-G L1 통합 검증: 매칭 직후 대화방 생성 + 메시지 송수신
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
echo "=== 양방향 관심 → Match + Conversation 자동 생성 ==="
M_REC=$(curl -s -H "Authorization: Bearer $M" "$BASE/me/recommendations" | extract 'JSON.parse(d).data[0]?.id')
F_REC=$(curl -s -H "Authorization: Bearer $F" "$BASE/me/recommendations" | extract 'JSON.parse(d).data[0]?.id')
curl -s -X POST "$BASE/recommendations/$M_REC/interest" -H "Authorization: Bearer $M" > /dev/null
RES=$(curl -s -X POST "$BASE/recommendations/$F_REC/interest" -H "Authorization: Bearer $F")
echo "$RES" | extract 'JSON.stringify(JSON.parse(d).data)'

echo ""
echo "=== M 의 대화 목록 ==="
CONV_ID=$(curl -s -H "Authorization: Bearer $M" "$BASE/me/conversations" | extract 'JSON.parse(d).data[0]?.id')
curl -s -H "Authorization: Bearer $M" "$BASE/me/conversations" | extract 'JSON.parse(d).data.map(c => `id=${c.id.slice(0,8)} status=${c.status} daysLeft=${c.daysLeft} lastType=${c.lastMessage?.messageType}`).join("\\n")'

echo ""
echo "=== M 의 대화방 상세 (시스템 메시지 1건 기대) ==="
curl -s -H "Authorization: Bearer $M" "$BASE/conversations/$CONV_ID" | extract 'JSON.parse(d).data.messages.map(m => `[${m.messageType}] ${m.isMine?"MINE":"PEER"}: ${m.content.slice(0,40)}`).join("\\n")'

echo ""
echo "=== M 메시지 전송 ==="
curl -s -X POST "$BASE/conversations/$CONV_ID/messages" -H "Authorization: Bearer $M" -H "Content-Type: application/json" -d '{"content":"안녕하세요! 프로필 잘 봤어요."}' | extract 'JSON.stringify({type:JSON.parse(d).data.messageType,isMine:JSON.parse(d).data.isMine,content:JSON.parse(d).data.content})'

echo ""
echo "=== F 가 같은 대화방 조회 → M 메시지 보임 + isMine=false ==="
curl -s -H "Authorization: Bearer $F" "$BASE/conversations/$CONV_ID" | extract 'JSON.parse(d).data.messages.map(m => `[${m.messageType}] ${m.isMine?"MINE":"PEER"}: ${m.content.slice(0,40)}`).join("\\n")'

echo ""
echo "=== F 답장 ==="
curl -s -X POST "$BASE/conversations/$CONV_ID/messages" -H "Authorization: Bearer $F" -H "Content-Type: application/json" -d '{"content":"반가워요! 같은 동네라 신기하네요."}' | extract 'JSON.stringify({type:JSON.parse(d).data.messageType,content:JSON.parse(d).data.content})'

echo ""
echo "=== 빈 메시지 → 400 ==="
curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/conversations/$CONV_ID/messages" -H "Authorization: Bearer $M" -H "Content-Type: application/json" -d '{"content":""}'

rm -f _test.png
