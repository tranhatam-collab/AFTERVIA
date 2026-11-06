import type { Locale } from '../i18n/locales.ts';

export type ReviewStatus = 'AI_DRAFT' | 'COMMUNITY_CHECKED' | 'EXPERT_REVIEWED' | 'STALE';

export type Review = {
  status: ReviewStatus;
  reviewer?: { name: string; expertise?: string };
  reviewed_on?: string;
  stale_reason?: string;
};

export type SourceRef = { id: string; note?: string };

export type Source = {
  id: string;
  organization: string;
  title: string;
  url: string;
  language: string;
  accessed: string;
  license: { kind: 'public-domain' | 'open-license' | 'permission-granted' | 'link-only' | 'restricted'; summary: string; url?: string };
  usage: { quote: boolean; summarize: boolean; translate: boolean; offline: boolean; commercial: boolean };
  scope: string[];
  notes?: string;
};

export type Card = {
  layer: 'S';
  id: string;
  locale: Locale;
  version: number;
  title: string;
  hazard: string;
  scope: { countries: string[]; audience: string[] };
  first_action: string;
  avoid: string[];
  steps: string[];
  limits: string;
  sources: SourceRef[];
  updated: string;
  based_on?: { locale: Locale; version: number };
  review: Review;
};

export type Article = {
  layer: 'J';
  id: string;
  locale: Locale;
  version: number;
  title: string;
  module: string;
  slug: string;
  summary: string;
  scope: { countries: string[]; climate: string[] };
  spec_ref: string;
  keywords?: string[];
  sources: SourceRef[];
  author: { kind: 'ai' | 'human'; name?: string };
  updated: string;
  disclaimer: 'none' | 'legal-land' | 'medical-first-aid' | 'electrical' | 'financial';
  review: Review;
};

export type CountryPack = {
  code: string;
  name: { en: string; vi?: string };
  locales: Locale[];
  currency: string;
  units: 'metric' | 'imperial';
  emergency_numbers: { service: string; number: string; source: string; checked_on: string }[];
  authorities: { role: string; name: string; url: string; source: string; checked_on: string }[];
  checked_on: string;
};

export type Item<T> = { file: string; data: T; body: string };
export type ContentIssue = { file: string; message: string };

export type ContentReport = {
  errors: ContentIssue[];
  warnings: ContentIssue[];
  counts: { sources: number; cards: number; articles: number; countries: number };
};

export type LoadedContent = {
  sources: Source[];
  cards: Item<Card>[];
  articles: Item<Article>[];
  countries: Item<CountryPack>[];
  report: ContentReport;
};
