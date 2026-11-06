import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import type { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';
import { effectiveReview, reviewIssues } from './review.ts';
import type { Article, Card, ContentIssue, CountryPack, Item, LoadedContent, Source, SourceRef, Spec } from './types.ts';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_CONTENT_DIR = resolve(PACKAGE_ROOT, 'content');
const SCHEMA_BASE = 'https://groundstead.iai.one/schema/';
const SCHEMA_NAMES = ['review', 'source', 'spec', 'card', 'article', 'country'] as const;
const STALE_COUNTRY_DAYS = 92;
const MIN_ARTICLE_BODY = 200;

// A module that carries legal, medical, electrical or financial risk must carry the matching disclaimer.
const REQUIRED_DISCLAIMER: Record<string, Article['disclaimer']> = {
  land: 'legal-land',
  health: 'medical-first-aid',
  power: 'electrical',
  fund: 'financial',
};

export type ValidateOptions = {
  contentDir?: string;
  schemaDir?: string;
  today?: string;
};

function buildValidators(schemaDir: string): Record<(typeof SCHEMA_NAMES)[number], ValidateFunction> {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  for (const name of SCHEMA_NAMES) ajv.addSchema(JSON.parse(readFileSync(join(schemaDir, `${name}.schema.json`), 'utf8')));
  const get = (name: string): ValidateFunction => {
    const fn = ajv.getSchema(`${SCHEMA_BASE}${name}.schema.json`);
    if (!fn) throw new Error(`schema ${name} did not load`);
    return fn;
  };
  return { review: get('review'), source: get('source'), spec: get('spec'), card: get('card'), article: get('article'), country: get('country') };
}

function describe(err: ErrorObject): string {
  const where = err.instancePath === '' ? '' : `${err.instancePath} `;
  if (err.keyword === 'required') return `${where}missing required field "${String((err.params as { missingProperty: string }).missingProperty)}"`;
  if (err.keyword === 'additionalProperties') return `${where}unknown field "${String((err.params as { additionalProperty: string }).additionalProperty)}"`;
  return `${where}${err.message ?? 'is invalid'}`;
}

export function parseFrontmatter(text: string): { data: unknown; body: string } | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text.replace(/^﻿/, ''));
  if (!m) return null;
  return { data: parseYaml(m[1] ?? ''), body: (m[2] ?? '').trim() };
}

function listFiles(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, ext));
    else if (name.endsWith(ext)) out.push(full);
  }
  return out;
}

function daysBetween(from: string, to: string): number {
  return Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export function loadContent(options: ValidateOptions = {}): LoadedContent {
  const contentDir = resolve(options.contentDir ?? DEFAULT_CONTENT_DIR);
  const schemaDir = resolve(options.schemaDir ?? join(DEFAULT_CONTENT_DIR, 'schema'));
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const v = buildValidators(schemaDir);
  const errors: ContentIssue[] = [];
  const warnings: ContentIssue[] = [];
  const rel = (file: string): string => relative(contentDir, file) || basename(file);
  const err = (file: string, message: string): void => void errors.push({ file: rel(file), message });
  const warn = (file: string, message: string): void => void warnings.push({ file: rel(file), message });

  // Runs a schema; reports each problem and tells the caller whether cross-checks may continue.
  const schemaOk = (fn: ValidateFunction, data: unknown, file: string): boolean => {
    if (fn(data)) return true;
    for (const e of fn.errors ?? []) err(file, describe(e));
    return false;
  };

  // ---- source ledger
  const sources: Source[] = [];
  const byId = new Map<string, Source>();
  const ledgerFile = join(contentDir, 'sources.json');
  if (existsSync(ledgerFile)) {
    let ledger: { sources?: unknown } = {};
    try {
      ledger = JSON.parse(readFileSync(ledgerFile, 'utf8')) as { sources?: unknown };
    } catch (e) {
      err(ledgerFile, `invalid JSON: ${(e as Error).message}`);
    }
    if (!Array.isArray(ledger.sources)) err(ledgerFile, 'must contain a "sources" array');
    else {
      for (const raw of ledger.sources as unknown[]) {
        if (!schemaOk(v.source, raw, ledgerFile)) continue;
        const src = raw as Source;
        if (byId.has(src.id)) {
          err(ledgerFile, `duplicate source id "${src.id}"`);
          continue;
        }
        const reuses = Object.values(src.usage).some(Boolean);
        if ((src.license.kind === 'link-only' || src.license.kind === 'restricted') && reuses) {
          err(ledgerFile, `source "${src.id}" is ${src.license.kind} but allows reuse; link-only and restricted sources must have every usage flag false`);
        }
        if (src.license.kind === 'public-domain' && !Object.values(src.usage).every(Boolean)) {
          err(ledgerFile, `source "${src.id}" is public-domain, so every usage flag must be true`);
        }
        // No reuse right without recorded evidence of where it comes from and when it was checked.
        if (reuses) {
          const missing = (['quote', 'checked_on', 'verified_via'] as const).filter((k) => !src.license[k]);
          if (missing.length > 0) err(ledgerFile, `source "${src.id}" allows reuse but has no recorded evidence (missing license.${missing.join(', license.')})`);
        }
        byId.set(src.id, src);
        sources.push(src);
      }
    }
  } else {
    err(ledgerFile, 'sources.json is missing');
  }

  const checkReview = (file: string, review: Parameters<typeof reviewIssues>[0]): void => {
    for (const msg of reviewIssues(review)) err(file, msg);
  };

  const checkSources = (file: string, refs: SourceRef[], locale: string, countries: string[]): void => {
    const covered = new Set<string>();
    const seen = new Set<string>();
    for (const ref of refs) {
      if (seen.has(ref.id)) err(file, `source "${ref.id}" is listed twice`);
      seen.add(ref.id);
      const src = byId.get(ref.id);
      if (!src) {
        err(file, `unknown source "${ref.id}" (not in sources.json)`);
        continue;
      }
      const blocked = (['summarize', 'offline', 'commercial'] as const).filter((k) => !src.usage[k]);
      if (blocked.length > 0) err(file, `source "${ref.id}" does not allow: ${blocked.join(', ')}`);
      if (src.language !== locale && !src.usage.translate) {
        err(file, `source "${ref.id}" is in "${src.language}" and does not allow translation into "${locale}"`);
      }
      for (const c of src.scope) covered.add(c);
    }
    for (const c of countries) {
      const ok = c === 'GLOBAL' ? covered.has('GLOBAL') : covered.has('GLOBAL') || covered.has(c);
      if (!ok) err(file, `no listed source covers country "${c}"`);
    }
  };

  const checkPlacement = (file: string, locale: string, expectedName: string, label: string): void => {
    const parent = basename(dirname(file));
    if (parent !== locale) err(file, `file is in "${parent}/" but declares locale "${locale}"`);
    if (basename(file, '.md') !== expectedName) err(file, `file name must be "${expectedName}.md" (the ${label})`);
  };

  // ---- content specs (English, one per module)
  const specs: Item<Spec>[] = [];
  const specById = new Map<string, Spec>();
  for (const file of listFiles(join(contentDir, 'specs'), '.md')) {
    const parsed = readItem(file, err);
    if (!parsed || !schemaOk(v.spec, parsed.data, file)) continue;
    const spec = parsed.data as Spec;
    if (specById.has(spec.id)) {
      err(file, `duplicate spec ${spec.id}`);
      continue;
    }
    if (basename(file, '.md') !== spec.id) err(file, `file name must be "${spec.id}.md"`);
    const needed = REQUIRED_DISCLAIMER[spec.module];
    if (needed && spec.disclaimer !== needed) err(file, `module "${spec.module}" requires disclaimer "${needed}" (found "${spec.disclaimer}")`);
    specById.set(spec.id, spec);
    specs.push({ file: rel(file), data: spec, body: parsed.body });
  }

  // ---- safety cards (layer S)
  const cards: Item<Card>[] = [];
  const cardKeys = new Map<string, Item<Card>>();
  for (const file of listFiles(join(contentDir, 'cards'), '.md')) {
    const parsed = readItem(file, err);
    if (!parsed || !schemaOk(v.card, parsed.data, file)) continue;
    const card = parsed.data as Card;
    const item: Item<Card> = { file: rel(file), data: card, body: parsed.body };
    const key = `${card.id}:${card.locale}`;
    checkPlacement(file, card.locale, card.id, 'card id');
    if (cardKeys.has(key)) {
      err(file, `duplicate card ${card.id} (${card.locale})`);
      continue;
    }
    cardKeys.set(key, item);
    cards.push(item);
    checkReview(file, card.review);
    checkSources(file, card.sources, card.locale, card.scope.countries);
  }
  for (const { data: card, file } of cards) {
    const abs = join(contentDir, file);
    if (card.locale === 'en') {
      if (card.based_on) err(abs, 'an English original must not have based_on');
      continue;
    }
    if (!card.based_on) {
      err(abs, `a ${card.locale} card is a translation and needs based_on (the original locale and version)`);
      continue;
    }
    if (card.based_on.locale === card.locale) err(abs, 'based_on.locale must differ from the card locale');
    const original = cardKeys.get(`${card.id}:${card.based_on.locale}`);
    if (!original) {
      err(abs, `based_on points to ${card.id} (${card.based_on.locale}), which does not exist`);
      continue;
    }
    if (card.based_on.version > original.data.version) err(abs, `based_on.version ${card.based_on.version} is newer than the original (${original.data.version})`);
    if (original.data.hazard !== card.hazard) err(abs, `hazard "${card.hazard}" differs from the original ("${original.data.hazard}")`);
    const effective = effectiveReview(card, original.data);
    if (effective.status === 'STALE' && card.review.status !== 'STALE') {
      warn(abs, `stale translation: original is at version ${original.data.version}, this was based on ${card.based_on.version}; it will be shown as STALE`);
    }
  }

  // ---- journey articles (layer J)
  const articles: Item<Article>[] = [];
  const articleKeys = new Set<string>();
  for (const file of listFiles(join(contentDir, 'modules'), '.md')) {
    const parsed = readItem(file, err);
    if (!parsed || !schemaOk(v.article, parsed.data, file)) continue;
    const article = parsed.data as Article;
    const key = `${article.slug}:${article.locale}`;
    checkPlacement(file, article.locale, article.slug, 'article slug');
    if (articleKeys.has(key)) {
      err(file, `duplicate article slug ${article.slug} (${article.locale})`);
      continue;
    }
    articleKeys.add(key);
    articles.push({ file: rel(file), data: article, body: parsed.body });
    checkReview(file, article.review);
    checkSources(file, article.sources, article.locale, article.scope.countries);
    if (parsed.body.length < MIN_ARTICLE_BODY) err(file, `article body is too short (${parsed.body.length} characters; minimum ${MIN_ARTICLE_BODY})`);
    if (article.author.kind === 'human' && !article.author.name) err(file, 'a human author needs a name');
    const spec = specById.get(article.spec_ref);
    if (!spec) err(file, `unknown spec_ref "${article.spec_ref}" (no such file in specs/)`);
    else {
      if (spec.module !== article.module) err(file, `module "${article.module}" differs from its spec's module "${spec.module}"`);
      if (spec.disclaimer !== article.disclaimer) err(file, `disclaimer "${article.disclaimer}" differs from its spec's "${spec.disclaimer}"`);
      if (article.sources.length < spec.minimum_sources.count) {
        err(file, `spec ${spec.id} requires at least ${spec.minimum_sources.count} source(s); the article lists ${article.sources.length}`);
      }
    }
    const needed = REQUIRED_DISCLAIMER[article.module];
    if (needed && article.disclaimer !== needed) err(file, `module "${article.module}" requires disclaimer "${needed}" (found "${article.disclaimer}")`);
  }

  // ---- country packs
  const countries: Item<CountryPack>[] = [];
  for (const file of listFiles(join(contentDir, 'countries'), '.json')) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      err(file, `invalid JSON: ${(e as Error).message}`);
      continue;
    }
    if (!schemaOk(v.country, raw, file)) continue;
    const pack = raw as CountryPack;
    countries.push({ file: rel(file), data: pack, body: '' });
    if (pack.status === 'verified' && pack.emergency_numbers.length === 0) err(file, 'a verified pack needs at least one emergency number');
    if (pack.status === 'partial' && !pack.pending) err(file, 'a partial pack must say what is still unverified (pending.en and pending.vi)');
    if (basename(file, '.json') !== pack.code) err(file, `file name must be "${pack.code}.json"`);
    const entries = [
      ...pack.emergency_numbers.map((e) => ({ label: `emergency number ${e.number}`, source: e.source, checked_on: e.checked_on })),
      ...pack.authorities.map((a) => ({ label: `authority ${a.name}`, source: a.source, checked_on: a.checked_on })),
    ];
    for (const entry of entries) {
      if (!byId.has(entry.source)) err(file, `${entry.label}: unknown source "${entry.source}"`);
      if (daysBetween(entry.checked_on, today) > STALE_COUNTRY_DAYS) warn(file, `${entry.label}: not re-checked for more than ${STALE_COUNTRY_DAYS} days`);
    }
  }

  return {
    sources,
    specs,
    cards,
    articles,
    countries,
    report: {
      errors,
      warnings,
      counts: { sources: sources.length, specs: specs.length, cards: cards.length, articles: articles.length, countries: countries.length },
    },
  };
}

export function validateContent(options: ValidateOptions = {}): LoadedContent['report'] {
  return loadContent(options).report;
}

function readItem(file: string, err: (file: string, message: string) => void): { data: unknown; body: string } | null {
  let parsed: { data: unknown; body: string } | null;
  try {
    parsed = parseFrontmatter(readFileSync(file, 'utf8'));
  } catch (e) {
    err(file, `frontmatter is not valid YAML: ${(e as Error).message.split('\n')[0] ?? ''}`);
    return null;
  }
  if (!parsed) {
    err(file, 'missing frontmatter (the file must start with a --- block)');
    return null;
  }
  return parsed;
}
