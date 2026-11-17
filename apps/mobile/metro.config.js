// Metro cho ứng dụng di động (MOBILE-BUNDLE-01).
//
// @aftervia/domain và @aftervia/i18n không có package.json, không nằm trong package-lock.json và không có
// workspaces. Chúng chỉ được khai báo qua `paths` của tsconfig.json, và Metro không đọc `paths` đó. Vì vậy
// bundle thất bại với "Unable to resolve module @aftervia/domain" khi có import giá trị từ hai gói này.
// Dựng bundle từng chạy được trên máy có liên kết cục bộ trong node_modules; liên kết đó không tái lập được từ lock.
//
// File này ánh xạ đúng hai gói đó sang mã nguồn trong repo, cùng nguồn với apps/mobile/tsconfig.json,
// và mở rộng watchFolders tới packages/ để Metro đọc được mã đó. Không ánh xạ gói nào khác.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..', '..');

const WORKSPACE_SOURCES = {
  '@aftervia/domain': path.join(repoRoot, 'packages', 'domain', 'src', 'index.ts'),
  '@aftervia/i18n': path.join(repoRoot, 'packages', 'i18n', 'src', 'index.ts'),
};

const config = getDefaultConfig(projectRoot);
config.watchFolders = [...(config.watchFolders ?? []), path.join(repoRoot, 'packages')];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const filePath = WORKSPACE_SOURCES[moduleName];
  if (filePath !== undefined) return { type: 'sourceFile', filePath };
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
