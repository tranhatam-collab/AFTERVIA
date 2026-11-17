import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXTRACTION_SCHEMA, validateExtraction, type Extraction, type ExtractionCheck } from '@aftervia/domain';

const DOC = '00000000-0000-4000-8000-00000000d0c1';
const SPEC = new URL('../../docs/spec/AFTERVIA_AZ_2026-10-31/engineering/09_EXTRACTION.schema.json', import.meta.url);

function field(value: string | number | null, sourceText: string | null): Record<string, unknown> {
  return { value, source_text: sourceText, page: 1, review_status: 'NEEDS_REVIEW' };
}

// Biên nhận đầy đủ, mọi giá trị khác null đều có nguồn.
function receipt(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    document_id: DOC,
    schema_version: '1.0',
    merchant: field('Cửa hàng A', 'Cửa hàng A'),
    purchase_date: field('2026-04-03', '03/04/2026'),
    amount_minor: field(125000, '125.000 đ'),
    currency: field('VND', 'VND'),
    item_name: field('Máy pha cà phê', 'Máy pha cà phê'),
    serial: field('SN-0001', 'Số serial: SN-0001'),
    warnings: [],
    ...over,
  };
}

function expectOk(result: ExtractionCheck): Extraction {
  if (!result.ok) throw new Error(`expected ok, got: ${result.errors.join(', ')}`);
  return result.value;
}

function errorsOf(result: ExtractionCheck): string[] {
  if (result.ok) throw new Error('expected a refusal, got ok');
  return result.errors;
}

describe('WO06-01 extraction schema and semantic checks', () => {
  it('WO06-01 the copied schema matches the specification file', () => {
    const spec = JSON.parse(readFileSync(SPEC, 'utf8'));
    expect(EXTRACTION_SCHEMA).toEqual(spec);
  });

  it('T12 a day and month written without a year are never converted into a date', () => {
    const result = validateExtraction(
      receipt({ purchase_date: field('2026-04-03', '03/04') }),
      { expectedDocumentId: DOC },
    );
    const extraction = expectOk(result);
    expect(extraction.purchase_date.value).toBeNull();
    expect(extraction.warnings).toContain('ambiguous:purchase_date');
    expect(extraction.purchase_date.review_status).toBe('NEEDS_REVIEW');
  });

  it('T12 a date whose parts are both twelve or less needs the locale: vi reads day first, en-US month first, unknown is held', () => {
    const unknownLocale = expectOk(validateExtraction(receipt(), { expectedDocumentId: DOC }));
    expect(unknownLocale.purchase_date.value).toBeNull();
    expect(unknownLocale.warnings).toContain('ambiguous:purchase_date');

    const vi = expectOk(validateExtraction(receipt(), { expectedDocumentId: DOC, locale: 'vi' }));
    expect(vi.purchase_date.value).toBe('2026-04-03');

    const enUs = expectOk(
      validateExtraction(receipt({ purchase_date: field('2026-03-04', '03/04/2026') }), { expectedDocumentId: DOC, locale: 'en-US' }),
    );
    expect(enUs.purchase_date.value).toBe('2026-03-04');

    const contradicted = errorsOf(
      validateExtraction(receipt({ purchase_date: field('2026-04-03', '03/04/2026') }), { expectedDocumentId: DOC, locale: 'en-US' }),
    );
    expect(contradicted).toContain('date_mismatch_with_source:purchase_date');
  });

  it('T12 an impossible calendar date or a date string the model did not normalize is refused by the schema', () => {
    expect(errorsOf(validateExtraction(receipt({ purchase_date: field('2026-02-31', '31/02/2026') }), { expectedDocumentId: DOC })).length).toBeGreaterThan(0);
    expect(errorsOf(validateExtraction(receipt({ purchase_date: field('03/04/2026', '03/04/2026') }), { expectedDocumentId: DOC })).length).toBeGreaterThan(0);
    expect(errorsOf(validateExtraction(receipt({ purchase_date: field('2026-04-30', '31/04/2026') }), { expectedDocumentId: DOC, locale: 'vi' }))).toContain(
      'invalid_date_in_source:purchase_date',
    );
  });

  it('T13 a missing currency is accepted only with a stated reason, and is never invented', () => {
    const noReason = errorsOf(
      validateExtraction(receipt({ currency: field(null, null) }), { expectedDocumentId: DOC }),
    );
    expect(noReason).toContain('null_without_reason:currency');

    const withReason = expectOk(
      validateExtraction(receipt({ currency: field(null, null), warnings: ['missing:currency'] }), { expectedDocumentId: DOC }),
    );
    expect(withReason.currency.value).toBeNull();
  });

  it('T13 a serial that the document does not state is never invented', () => {
    const invented = errorsOf(
      validateExtraction(receipt({ serial: field('SN-9999', null) }), { expectedDocumentId: DOC }),
    );
    expect(invented).toContain('value_without_source:serial');

    const honestNull = expectOk(
      validateExtraction(receipt({ serial: field(null, null), warnings: ['missing:serial'] }), { expectedDocumentId: DOC }),
    );
    expect(honestNull.serial.value).toBeNull();
  });

  it('T13 a currency must be an ISO 4217 code: VND is accepted; unknown, reserved or lowercase codes are refused', () => {
    expect(expectOk(validateExtraction(receipt(), { expectedDocumentId: DOC })).currency.value).toBe('VND');
    expect(errorsOf(validateExtraction(receipt({ currency: field('ABC', 'ABC') }), { expectedDocumentId: DOC }))).toContain(
      'currency_not_iso4217:ABC',
    );
    expect(errorsOf(validateExtraction(receipt({ currency: field('XXX', 'XXX') }), { expectedDocumentId: DOC }))).toContain(
      'currency_not_iso4217:XXX',
    );
    expect(errorsOf(validateExtraction(receipt({ currency: field('usd', 'usd') }), { expectedDocumentId: DOC })).length).toBeGreaterThan(0);
  });

  it('T12 the model cannot confirm its own output, and cannot write a result for another document', () => {
    const confirmed = errorsOf(
      validateExtraction(
        receipt({ merchant: { value: 'Cửa hàng A', source_text: 'Cửa hàng A', page: 1, review_status: 'CONFIRMED' } }),
        { expectedDocumentId: DOC },
      ),
    );
    expect(confirmed).toContain('model_cannot_confirm:merchant');

    const otherDoc = errorsOf(
      validateExtraction(receipt({ document_id: '00000000-0000-4000-8000-00000000d0c2' }), { expectedDocumentId: DOC }),
    );
    expect(otherDoc).toContain('document_mismatch');
  });
});
