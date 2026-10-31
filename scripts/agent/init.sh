#!/bin/bash
# 세션 시작 때 1회: scripts/agent/init.sh (두 번째부터는 수 초)
# 의존성(lockfile 이 바뀌었을 때만) → Node·pnpm 버전 → 필요한 변수 이름 중 없는 것(이름만). 키 값은 출력하지 않는다.
# 비밀값이 전혀 없는 트리(클라우드 기본 환경)에서도 통과한다.
root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "저장소 안에서 실행할 것"; exit 1; }
cd "$root" || exit 1

command -v pnpm >/dev/null || { echo "pnpm 없음 — corepack enable 또는 npm i -g pnpm"; exit 1; }

# 의존성: node_modules 가 없거나, 이 스크립트가 설치한 트리에서 lockfile 이 바뀌었을 때만 설치.
# 해시 파일이 없는 트리(사람이 관리하는 공유 트리)는 건드리지 않는다
hashes=node_modules/.agent-init.sha256
if [ ! -d node_modules ] || { [ -f "$hashes" ] && ! sha256sum --check --status "$hashes" 2>/dev/null; }; then
  pnpm install --frozen-lockfile || { echo "pnpm install 실패"; exit 1; }
  sha256sum package.json pnpm-lock.yaml >"$hashes"
elif [ ! -f "$hashes" ]; then
  echo "node_modules 는 이 스크립트가 관리하지 않는다 — 의존성이 이상하면 운영자에게 알릴 것"
fi

# 변수 이름: 루트 .env.example 과 apps/api/.env.example 에 적힌 이름 중 환경에도 .env 파일에도 없는 것
from_files() { grep -hE "^$1=" .env apps/api/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"\r'; }
has() { [ -n "${!1}" ] || [ -n "$(from_files "$1")" ]; }
missing=0
for f in .env.example apps/api/.env.example; do
  [ -f "$f" ] || continue
  for k in $(grep -oE '^[A-Z][A-Z0-9_]+=' "$f" | tr -d '='); do
    has "$k" || { echo "키 없음: $k"; missing=1; }
  done
done
[ "$missing" = 1 ] && echo "비밀값 없음 — 클라우드 기본 환경이면 정상, 로컬이면 .env(루트·apps/api)를 확인할 것"

echo "init 완료 ($(git rev-parse --abbrev-ref HEAD), Node $(node -v), pnpm $(pnpm -v))"
