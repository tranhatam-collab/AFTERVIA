#!/usr/bin/env node
// Chạy API cục bộ (WO26-02). Trình nạp của Vite (đã có trong repo) tải tệp TypeScript; không thêm phụ thuộc.
// Cấu hình chỉ đọc từ biến môi trường AFTERVIA_LOCAL_*. Lỗi cấu hình thì không mở cổng nào.
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const vite = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  // Cùng alias với vitest.config.ts, vì các gói @aftervia/* không nằm trong node_modules.
  resolve: {
    alias: {
      '@aftervia/domain': fileURLToPath(new URL('../../packages/domain/src/index.ts', import.meta.url)),
      '@aftervia/i18n': fileURLToPath(new URL('../../packages/i18n/src/index.ts', import.meta.url)),
    },
  },
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
});

async function fail(message) {
  console.error(`API cục bộ không khởi động: ${message}`);
  process.exitCode = 1;
  await vite.close();
}

try {
  const local = await vite.ssrLoadModule('/services/api/src/local/start-local.ts');
  const parsed = local.readLocalConfig(process.env);
  if (!parsed.ok) {
    await fail(parsed.error);
  } else {
    const api = await local.startLocalApi(parsed.config);
    console.log(`API cục bộ (chế độ kiểm thử) nghe tại http://${api.address}:${api.port}. Ctrl+C để dừng.`);
    const shutdown = async () => {
      await api.close();
      await vite.close();
      process.exit(0);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }
} catch (error) {
  await fail(error instanceof Error ? error.message : 'lỗi không xác định');
}
