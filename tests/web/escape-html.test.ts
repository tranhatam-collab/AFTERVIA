import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../../apps/landing/src/render.mjs';

// OWN-A-15 (audit 10/11, A-12). Every dynamic value on the landing page goes through escapeHtml, but the
// function itself had no direct test: it was only covered through the rendered pages.
describe('OWN-A-15 escapeHtml', () => {
  it('escapes all five characters that can break out of markup or an attribute', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('escapes the ampersand first, so an escape is never doubled into a wrong entity', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it('neutralises a script tag and an attribute break-out', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('" onmouseover="alert(1)')).toBe('&quot; onmouseover=&quot;alert(1)');
    expect(escapeHtml("' onfocus='alert(1)")).toBe('&#39; onfocus=&#39;alert(1)');
  });

  it('leaves text that needs no escaping unchanged, including non-ASCII', () => {
    expect(escapeHtml('Sửa chữa đồ gia dụng')).toBe('Sửa chữa đồ gia dụng');
    expect(escapeHtml('')).toBe('');
  });

  it('accepts values that are not strings', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(undefined)).toBe('undefined');
  });
});
