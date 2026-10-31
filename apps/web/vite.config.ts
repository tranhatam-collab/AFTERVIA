import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Web Desk (WO10-01). Gốc dự án là apps/web. Bộ i18n dùng chung với API và kiểm thử, nối qua alias.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      '@aftervia/i18n': fileURLToPath(new URL('../../packages/i18n/src/index.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
});
