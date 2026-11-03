#!/usr/bin/env node
// E2E Chromium (E2E-WEB-01): luồng web đầy đủ qua API cục bộ thật và Web Desk (Vite dev server, /v1 đi cùng gốc qua proxy).
// Bước: thêm món, mở case, gắn bằng chứng và mời người tham gia (chỉ metadata, qua hàm cơ sở dữ liệu), chia tài liệu,
// Desk xử lý (gửi, phân loại, xử lý, giải quyết có outcome, đóng), xuất gói (T24).
// Chạy: npm run e2e:web. Cần TEST_DATABASE_URL trỏ tới DB _test (DB bị đặt lại) và Playwright
// (đặt AFTERVIA_E2E_PLAYWRIGHT tới thư mục gói 'playwright' nếu không cài trong repo).
// Dữ liệu tổng hợp. Không in URL DB, khóa hay token. Ảnh và tóm tắt ghi vào .loop/e2e (không commit).
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createServer } from 'vite';
import { applyMigrations, applyShim, assertTestDatabase } from '../db/migrate.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, '.loop', 'e2e');
const API_PORT = 8787;
const DESK_PORT = 5173;
const API = `http://127.0.0.1:${API_PORT}`;
const DESK = `http://127.0.0.1:${DESK_PORT}`;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const ITEM_TITLE = 'Máy giặt E2E';
const USERS = {
  customer: '00000000-0000-4000-8000-0000000000a1',
  partner: '00000000-0000-4000-8000-0000000000a2',
  merchantOwner: '00000000-0000-4000-8000-0000000000a3',
  merchantAgent: '00000000-0000-4000-8000-0000000000a4',
};
const STATUS_LABEL = {
  submitted: 'Đã gửi',
  triaged: 'Đã phân loại',
  in_progress: 'Đang xử lý',
  resolved: 'Đã giải quyết',
  closed: 'Đã đóng',
};

async function resetDatabase(dbUrl) {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query('drop schema if exists public cascade');
    await client.query('drop schema if exists auth cascade');
    await client.query('drop schema if exists aftervia_meta cascade');
    await client.query('create schema public');
    await applyShim(client);
    await applyMigrations(client);
  } finally {
    await client.end();
  }
}

async function insertUsers(dbUrl) {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    for (const [name, id] of Object.entries(USERS)) {
      await client.query('insert into auth.users (id, email) values ($1, $2)', [id, `${name}@e2e.test.invalid`]);
    }
  } finally {
    await client.end();
  }
}

// Chạy một khối dưới vai trò người dùng (như PostgREST), trong một transaction. Chỉ dùng để chuẩn bị và kiểm tra dữ liệu.
async function asActor(dbUrl, userId, run) {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query('begin');
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: 'authenticated' })]);
    await client.query('set local role authenticated');
    try {
      const result = await run(client);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  } finally {
    await client.end();
  }
}

async function adminQuery(dbUrl, sql, params = []) {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows;
  } finally {
    await client.end();
  }
}

// Tài liệu đã tải xong, quét bởi scanner không khả dụng: trạng thái được phép làm bằng chứng (như các kiểm thử HTTP).
async function completedDocument(dbUrl, userId) {
  const doc = await asActor(dbUrl, userId, async (c) => (await c.query("select out_document_id from public.create_upload_ticket('image/png', 4096)")).rows[0].out_document_id);
  await asActor(dbUrl, userId, (c) =>
    c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', 'image/png', 4096)", [doc]),
  );
  await asActor(dbUrl, userId, (c) => c.query('select public.complete_upload($1, $2, $3, $4)', [doc, 'e2e-doc-1', 'c'.repeat(64), 4096]));
  return doc;
}

async function apiJson(method, path, token, body) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} returned ${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function signIn(userId) {
  return (await apiJson('POST', '/v1/dev/sign-in', null, { user_id: userId })).access_token;
}

async function createOrganization(tokens) {
  const org = await apiJson('POST', '/v1/organizations', tokens.merchantOwner, { legal_name: 'Cửa hàng E2E', country: 'VN' });
  await apiJson('POST', `/v1/organizations/${org.id}/members`, tokens.merchantOwner, { user_id: USERS.merchantAgent, role: 'agent' });
  return org.id;
}

async function findItemId(token, title) {
  const body = await apiJson('GET', '/v1/items', token);
  const items = Array.isArray(body) ? body : body.items;
  const found = Array.isArray(items) ? items.find((item) => item.title === title) : undefined;
  if (!found) throw new Error('the new item is not listed by the API');
  return found.id;
}

function startApi(dbUrl, secret) {
  const child = spawn(process.execPath, [join(ROOT, 'tools/dev/api-local.mjs')], {
    cwd: ROOT,
    env: { ...process.env, AFTERVIA_LOCAL_DATABASE_URL: dbUrl, AFTERVIA_LOCAL_JWT_SECRET: secret, AFTERVIA_LOCAL_PORT: String(API_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  const stop = () =>
    new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', () => resolve());
      child.kill('SIGTERM');
    });
  const healthy = (async () => {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`the API stopped early: ${output.slice(-300)}`);
      try {
        if ((await fetch(`${API}/healthz`)).ok) return;
      } catch {
        // chưa nghe: thử lại
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error('the API did not become healthy');
  })();
  return { stop, healthy, output: () => output };
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const target = process.env.AFTERVIA_E2E_PLAYWRIGHT || 'playwright';
  try {
    return require(target);
  } catch {
    throw new Error(`Playwright could not be loaded from "${target}"; set AFTERVIA_E2E_PLAYWRIGHT to the playwright package directory`);
  }
}

async function newDeskPage(browser, token, summary, label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
  await context.addInitScript((value) => {
    window.sessionStorage.setItem('aftervia.dev.token', value);
  }, token);
  const page = await context.newPage();
  page.on('pageerror', (error) => summary.pageErrors.push(`${label}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') summary.consoleErrors.push(`${label}: ${message.text()}`);
  });
  return { context, page };
}

// Đọc phiên bản hiện tại từ DB rồi điền vào ô phiên bản, để bước chuyển không phụ thuộc vào trạng thái form.
async function transition(page, dbUrl, caseId, { nextState, outcome, reason }) {
  const [{ version }] = await adminQuery(dbUrl, 'select version from public.cases where id = $1', [caseId]);
  await page.locator('[name="caseId"]').fill(caseId);
  await page.locator('[name="expectedVersion"]').fill(String(version));
  await page.locator('[name="nextState"]').selectOption(nextState);
  if (outcome !== undefined) await page.locator('[name="outcome"]').selectOption(outcome);
  await page.locator('[name="reason"]').fill(reason);
  await page.getByRole('button', { name: 'Chuyển trạng thái', exact: true }).click();
  await page.getByText(`Đã chuyển sang ${STATUS_LABEL[nextState]}. Phiên bản mới: ${version + 1}.`, { exact: true }).waitFor();
}

async function main() {
  const dbUrl = process.env.TEST_DATABASE_URL ?? '';
  assertTestDatabase(dbUrl);
  mkdirSync(OUT, { recursive: true });
  const summary = { steps: [], pageErrors: [], consoleErrors: [], ok: false };
  const log = (message) => {
    summary.steps.push(message);
    console.log(`ok: ${message}`);
  };
  let api;
  let vite;
  let browser;
  try {
    await resetDatabase(dbUrl);
    await insertUsers(dbUrl);
    log('cơ sở dữ liệu _test đặt lại và có người dùng tổng hợp');
    api = startApi(dbUrl, randomBytes(32).toString('hex'));
    await api.healthy;
    log(`API cục bộ nghe tại ${API}`);
    const tokens = {};
    for (const [name, id] of Object.entries(USERS)) tokens[name] = await signIn(id);
    const orgId = await createOrganization(tokens);
    log('tổ chức và thành viên agent tạo qua API');

    process.env.AFTERVIA_LOCAL_API_URL = API;
    vite = await createServer({
      configFile: join(ROOT, 'apps/web/vite.config.ts'),
      server: { host: '127.0.0.1', port: DESK_PORT, strictPort: true },
      logLevel: 'warn',
    });
    await vite.listen();
    log(`Web Desk (Vite) nghe tại ${DESK}`);

    const { chromium } = loadPlaywright();
    browser = await chromium.launch();

    const customer = await newDeskPage(browser, tokens.customer, summary, 'customer');
    const page = customer.page;
    await page.goto(DESK);
    await page.getByRole('button', { name: 'Thêm món', exact: true }).waitFor();
    await page.locator('[name="title"]').fill(ITEM_TITLE);
    await page.getByRole('button', { name: 'Thêm món', exact: true }).click();
    await page.getByText('Đã thêm món đồ.', { exact: true }).waitFor();
    const itemId = await findItemId(tokens.customer, ITEM_TITLE);
    log('thêm món đồ trên Desk (mã món lấy từ API để điền form mở case)');

    await page.locator('[name="itemId"]').fill(itemId);
    await page.locator('[name="organizationId"]').fill(orgId);
    await page.locator('[name="description"]').fill('Máy không lên nguồn (E2E)');
    await page.getByRole('button', { name: 'Mở case', exact: true }).click();
    const opened = page.getByText(/Đã mở case [0-9a-f-]{36}\./);
    await opened.waitFor();
    const caseId = (await opened.textContent()).match(UUID)[0];
    log(`mở case ${caseId} trên Desk`);

    const docId = await completedDocument(dbUrl, USERS.customer);
    await asActor(dbUrl, USERS.customer, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseId, docId]));
    await asActor(dbUrl, USERS.customer, (c) =>
      c.query("select public.invite_case_participant($1::uuid, $2::uuid, now() + interval '1 day') as id", [caseId, USERS.partner]),
    );
    log('bằng chứng gắn và người tham gia mời qua hàm cơ sở dữ liệu (chỉ metadata)');

    await transition(page, dbUrl, caseId, { nextState: 'submitted', reason: 'Gửi yêu cầu (E2E)' });
    log('khách gửi case trên Desk');

    await page.locator('[name="documentId"]').fill(docId);
    await page.locator('[name="recipientId"]').fill(USERS.partner);
    if ((await page.locator('[name="grantCaseId"]').inputValue()) !== caseId) throw new Error('the grant form does not carry the active case');
    await page.getByRole('button', { name: 'Chia tài liệu', exact: true }).click();
    const granted = page.getByText(/Đã chia tài liệu\. Mã quyền: [0-9a-f-]{36}\./);
    await granted.waitFor();
    const grantId = (await granted.textContent()).match(UUID)[0];
    const access = await asActor(dbUrl, USERS.partner, async (c) =>
      (await c.query('select out_allowed from public.check_document_access($1::uuid, $2::uuid)', [caseId, docId])).rows[0],
    );
    if (access?.out_allowed !== true) throw new Error('the partner cannot read the granted document metadata');
    log(`chia tài liệu metadata cho người tham gia: grant ${grantId}; người tham gia được phép đọc`);

    const merchant = await newDeskPage(browser, tokens.merchantAgent, summary, 'merchant');
    const mpage = merchant.page;
    await mpage.goto(DESK);
    await mpage.getByRole('button', { name: 'Thêm món', exact: true }).waitFor();
    await transition(mpage, dbUrl, caseId, { nextState: 'triaged', reason: 'Phân loại (E2E)' });
    await transition(mpage, dbUrl, caseId, { nextState: 'in_progress', reason: 'Đang xử lý (E2E)' });
    await transition(mpage, dbUrl, caseId, { nextState: 'resolved', outcome: 'repaired', reason: 'Đã sửa xong (E2E)' });
    await transition(mpage, dbUrl, caseId, { nextState: 'closed', reason: 'Đóng sau khi giải quyết (E2E)' });
    log('Desk xử lý: phân loại, xử lý, giải quyết có outcome, đóng case');

    const [caseRow] = await adminQuery(dbUrl, 'select status, outcome, version from public.cases where id = $1', [caseId]);
    if (caseRow.status !== 'closed' || caseRow.outcome !== 'repaired') throw new Error(`the case is ${caseRow.status}/${caseRow.outcome}, not closed/repaired`);
    log(`cơ sở dữ liệu: case đã đóng với outcome repaired, phiên bản ${caseRow.version}`);

    await page.getByRole('button', { name: 'Tạo gói xuất', exact: true }).click();
    const exported = page.getByText(/Đã tạo gói xuất [0-9a-f-]{36}\. Trạng thái: Đã xong\./);
    await exported.waitFor();
    const jobId = (await exported.textContent()).match(UUID)[0];
    const exportSection = page.locator('section', { has: page.getByRole('heading', { name: 'Xuất dữ liệu', exact: true }) });
    if ((await exportSection.locator('a[href]').count()) !== 0) throw new Error('the export section renders a download link');
    const [{ n: jobs }] = await adminQuery(dbUrl, 'select count(*)::int as n from public.export_jobs where id = $1', [jobId]);
    if (jobs !== 1) throw new Error('the export job is not stored');
    log(`xuất gói ${jobId} (T24): trạng thái Đã xong, lưu trong export_jobs, không có liên kết tải`);

    await page.screenshot({ path: join(OUT, 'customer-final.png'), fullPage: true });
    await mpage.screenshot({ path: join(OUT, 'merchant-final.png'), fullPage: true });
    summary.ids = { caseId, docId, grantId, jobId };
    summary.ok = summary.pageErrors.length === 0;
    if (!summary.ok) throw new Error(`page errors: ${summary.pageErrors.length}`);
  } finally {
    await browser?.close().catch(() => {});
    await vite?.close().catch(() => {});
    if (api) {
      await api.stop().catch(() => {});
      writeFileSync(join(OUT, 'api.log'), api.output());
    }
    writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  }
}

main().then(
  () => {
    console.log('E2E-WEB-01: đạt');
  },
  (error) => {
    console.error(`E2E-WEB-01: lỗi: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  },
);
