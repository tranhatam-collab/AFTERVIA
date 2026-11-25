import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = resolve(ROOT, 'out');

// Built-output tests never skip: a missing build is a failure (run `npm run build` first).
export function readOut(rel: string): string {
  const file = resolve(OUT, rel);
  if (!existsSync(file)) throw new Error(`missing build output ${rel}: run npm run build`);
  return readFileSync(file, 'utf8');
}

type Node = { nodeName: string; value?: string; attrs?: { name: string; value: string }[]; childNodes?: Node[] };

export function elements(html: string, tag: string): Record<string, string>[] {
  const found: Record<string, string>[] = [];
  const visit = (node: Node) => {
    if (node.nodeName === tag) found.push(Object.fromEntries((node.attrs ?? []).map((a) => [a.name, a.value])));
    for (const child of node.childNodes ?? []) visit(child);
    const content = (node as { content?: Node }).content;
    if (content) visit(content);
  };
  visit(parse(html) as unknown as Node);
  return found;
}

// Text a reader can see. Next.js also repeats page text inside <script> data, so a plain substring
// search over the HTML can pass after the visible text is gone; this helper ignores script and style.
export function visibleText(html: string): string {
  const parts: string[] = [];
  const visit = (node: Node) => {
    if (node.nodeName === 'script' || node.nodeName === 'style' || node.nodeName === 'noscript') return;
    if (node.nodeName === '#text' && node.value) parts.push(node.value);
    for (const child of node.childNodes ?? []) visit(child);
    const content = (node as { content?: Node }).content;
    if (content) visit(content);
  };
  visit(parse(html) as unknown as Node);
  return parts.join('');
}
