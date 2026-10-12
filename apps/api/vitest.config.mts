import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// ES module 이라 __dirname 이 없다 — import.meta.url 에서 shared 소스 경로를 만든다
const sharedSrc = fileURLToPath(new URL('../../packages/shared/src/', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // 테스트는 빌드 없이 shared 소스를 읽는다. 앱 실행·빌드는 dist 를 쓴다
      { find: /^@prologue\/shared$/, replacement: `${sharedSrc}index.ts` },
      { find: /^@prologue\/shared\/(.*)$/, replacement: `${sharedSrc}$1` },
    ],
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
