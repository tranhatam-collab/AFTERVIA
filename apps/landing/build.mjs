#!/usr/bin/env node
// Build landing tĩnh AFTERVIA. Chỉ dùng thư viện chuẩn của Node, không cần npm install.
// Lệnh: node apps/landing/build.mjs
// Biến AFTERVIA_SITE_ENV: production | preview (mặc định preview, tức noindex).
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT } from './src/content.mjs';
import { renderLocalePage, renderNotFound, renderRobots, renderSitemap, validateContent } from './src/render.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
export const DEFAULT_OUT_DIR = join(HERE, 'dist');

export function normalizeEnv(value) {
  const env = value === undefined || value === '' ? 'preview' : value;
  if (env !== 'production' && env !== 'preview') {
    throw new Error(`AFTERVIA_SITE_ENV phải là production hoặc preview, nhận được: ${value}`);
  }
  return env;
}

function assertSafeOutDir(outDir) {
  const protectedDirs = [REPO_ROOT, HERE, join(HERE, 'src'), join(HERE, 'public')];
  if (protectedDirs.includes(outDir) || outDir.startsWith(join(HERE, 'src') + sep) || outDir.startsWith(join(HERE, 'public') + sep)) {
    throw new Error(`thư mục build không an toàn: ${outDir}`);
  }
}

function copyTree(fromDir, toDir, relDir = '', out = []) {
  mkdirSync(join(toDir, relDir), { recursive: true });
  for (const entry of readdirSync(join(fromDir, relDir), { withFileTypes: true })) {
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      copyTree(fromDir, toDir, rel, out);
    } else if (entry.isFile()) {
      copyFileSync(join(fromDir, rel), join(toDir, rel));
      out.push(rel);
    }
  }
  return out;
}

// Trả về { outDir, env, files }. Dừng bằng lỗi nếu nội dung hoặc môi trường không hợp lệ.
export function buildLanding({ outDir = DEFAULT_OUT_DIR, siteEnv = process.env.AFTERVIA_SITE_ENV, content = CONTENT } = {}) {
  const env = normalizeEnv(siteEnv);
  const problems = validateContent(content);
  if (problems.length > 0) {
    throw new Error(`nội dung không đạt điều kiện build:\n- ${problems.join('\n- ')}`);
  }
  const out = resolve(outDir);
  assertSafeOutDir(out);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'en'), { recursive: true });

  const files = [];
  const write = (rel, data) => {
    writeFileSync(join(out, rel), data, 'utf8');
    files.push(rel);
  };
  write('index.html', renderLocalePage(content.vi, env));
  write('en/index.html', renderLocalePage(content.en, env));
  write('404.html', renderNotFound(content));
  write('robots.txt', renderRobots(env));
  write('sitemap.xml', renderSitemap(content));
  copyFileSync(join(HERE, 'src', 'styles.css'), join(out, 'styles.css'));
  files.push('styles.css');
  files.push(...copyTree(join(HERE, 'public'), out));
  files.sort();
  return { outDir: out, env, files };
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const result = buildLanding();
    console.log(`landing OK: ${result.files.length} tệp, môi trường ${result.env}, thư mục ${result.outDir}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
