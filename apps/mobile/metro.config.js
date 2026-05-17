// pnpm 모노레포 + Expo Router 대응 Metro 설정.
// 워크스페이스 루트의 node_modules 와 packages/* 까지 metro 가 추적하도록 한다.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. 모노레포 전체 파일 변경 감지
config.watchFolders = [workspaceRoot];

// 2. node_modules 탐색 경로 명시 (앱 로컬 → 워크스페이스 루트)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. 계층적 탐색 비활성화 (pnpm 의 비호이스트 구조 대응)
config.resolver.disableHierarchicalLookup = true;

// 4. pnpm 의 심볼릭 링크 해석
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
