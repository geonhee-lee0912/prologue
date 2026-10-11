import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // 테스트는 빌드 없이 정책 원본을 읽는다. 앱(Metro)은 dist 를 쓴다
      '@prologue/shared/policy': path.resolve(__dirname, '../../packages/shared/src/policy.ts'),
    },
  },
  test: {
    include: ['domain/**/*.spec.ts', 'mock/**/*.spec.ts', 'theme/**/*.spec.ts'],
    environment: 'node',
  },
});
