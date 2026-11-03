import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Web Desk (WO10-01). Gốc dự án là apps/web. Bộ i18n dùng chung với API và kiểm thử, nối qua alias.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      '@aftervia/i18n': fileURLToPath(new URL('../../packages/i18n/src/index.ts', import.meta.url)),
      '@aftervia/domain': fileURLToPath(new URL('../../packages/domain/src/index.ts', import.meta.url)),
    },
  },
  // Chỉ máy chủ phát triển (không ảnh hưởng bản build): Desk gọi /v1 cùng gốc, Vite chuyển tới API cục bộ, nên không cần CORS.
  server: {
    proxy: {
      '/v1': { target: process.env.AFTERVIA_LOCAL_API_URL ?? 'http://127.0.0.1:8787' },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
});
