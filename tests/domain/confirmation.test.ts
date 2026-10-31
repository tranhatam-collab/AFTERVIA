import { describe, expect, it } from 'vitest';
import {
  CRITICAL_FIELDS,
  confirmField,
  gateAction,
  rejectField,
  validateExtraction,
  type ConfirmOutcome,
  type Extraction,
} from '@aftervia/domain';

const DOC = '00000000-0000-4000-8000-00000000d0c1';
const PERSON = 'nguoi-xac-nhan-01';
const AT = '2026-10-31T16:30:00Z';

function field(value: string | number | null, sourceText: string | null): Record<string, unknown> {
  return { value, source_text: sourceText, page: 1, review_status: 'NEEDS_REVIEW' };
}

function receipt(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    document_id: DOC,
    schema_version: '1.0',
    merchant: field('Cửa hàng A', 'Cửa hàng A'),
    purchase_date: field('2026-04-03', '2026-04-03'),
    amount_minor: field(125000, '125.000 đ'),
    currency: field('VND', 'VND'),
    item_name: field('Máy pha cà phê', 'Máy pha cà phê'),
    serial: field('SN-0001', 'Số serial: SN-0001'),
    warnings: [],
    ...over,
  };
}

function extractionFrom(over: Record<string, unknown> = {}): Extraction {
  const result = validateExtraction(receipt(over), { expectedDocumentId: DOC });
  if (!result.ok) throw new Error(`fixture refused: ${result.errors.join(', ')}`);
  return result.value;
}

function confirmedValue(outcome: ConfirmOutcome): Extraction {
  if (!outcome.ok) throw new Error(`expected confirmation, got: ${outcome.errors.join(', ')}`);
  return outcome.value;
}

function errorsOf(outcome: ConfirmOutcome): string[] {
  if (outcome.ok) throw new Error('expected a refusal, got a confirmation');
  return outcome.errors;
}

describe('WO06-03 confirmation rules and the action gate', () => {
  it('T12 an ambiguous date blocks every action until a person confirms it, and the confirmation keeps the person and the time', () => {
    let extraction = extractionFrom({ purchase_date: field('2026-04-03', '03/04/2026') });
    expect(extraction.purchase_date.value).toBeNull();
    extraction = confirmedValue(confirmField(extraction, { field: 'amount_minor', value: 125000, actorId: PERSON, confirmedAt: AT }));
    extraction = confirmedValue(confirmField(extraction, { field: 'currency', value: 'VND', actorId: PERSON, confirmedAt: AT }));
    extraction = confirmedValue(confirmField(extraction, { field: 'serial', value: 'SN-0001', actorId: PERSON, confirmedAt: AT }));
    expect(gateAction(extraction)).toEqual({ allowed: false, blockedBy: ['unconfirmed:purchase_date'] });

    expect(errorsOf(confirmField(extraction, { field: 'purchase_date', value: '03/04/2026', actorId: PERSON, confirmedAt: AT }))).toContain(
      'purchase_date_must_be_iso_date',
    );

    const done = confirmField(extraction, { field: 'purchase_date', value: '2026-04-03', actorId: PERSON, confirmedAt: AT });
    if (!done.ok) throw new Error('confirmation of a valid date should pass');
    expect(done.audit).toEqual({ field: 'purchase_date', value: '2026-04-03', actorId: PERSON, confirmedAt: AT });
    expect(done.value.purchase_date.review_status).toBe('CONFIRMED');
    expect(done.value.warnings).not.toContain('ambiguous:purchase_date');
    expect(gateAction(done.value)).toEqual({ allowed: true, blockedBy: [] });
  });

  it('T13 a missing currency or serial stays null until a person confirms its absence with a reason, and is never invented', () => {
    let extraction = extractionFrom({
      currency: field(null, null),
      serial: field(null, null),
      warnings: ['missing:currency', 'missing:serial'],
    });
    expect(errorsOf(confirmField(extraction, { field: 'currency', value: null, actorId: PERSON, confirmedAt: AT }))).toContain(
      'absent_reason_required:currency',
    );
    expect(errorsOf(confirmField(extraction, { field: 'currency', value: 'ABC', actorId: PERSON, confirmedAt: AT }))).toContain(
      'currency_must_be_iso4217',
    );
    expect(errorsOf(confirmField(extraction, { field: 'serial', value: '  ', actorId: PERSON, confirmedAt: AT }))).toContain(
      'serial_must_be_non_empty',
    );

    extraction = confirmedValue(
      confirmField(extraction, { field: 'currency', value: null, absentReason: 'confirmed_absent', actorId: PERSON, confirmedAt: AT }),
    );
    expect(extraction.currency.value).toBeNull();
    expect(extraction.currency.review_status).toBe('CONFIRMED');
    expect(extraction.warnings).toContain('confirmed_absent:currency');
    expect(extraction.warnings).not.toContain('missing:currency');

    extraction = confirmedValue(confirmField(extraction, { field: 'serial', value: 'SN-7', actorId: PERSON, confirmedAt: AT }));
    expect(extraction.serial.value).toBe('SN-7');
    expect(extraction.serial.source_text).toBeNull();
    expect(gateAction(extraction).blockedBy).toEqual(['unconfirmed:purchase_date', 'unconfirmed:amount_minor']);
  });

  it('T14 every critical field must be confirmed by a person before any action, and the gate names each field still open', () => {
    const extraction = extractionFrom();
    expect(CRITICAL_FIELDS).toEqual(['purchase_date', 'amount_minor', 'currency', 'serial']);
    expect(gateAction(extraction)).toEqual({
      allowed: false,
      blockedBy: ['unconfirmed:purchase_date', 'unconfirmed:amount_minor', 'unconfirmed:currency', 'unconfirmed:serial'],
    });
  });

  it('T14 a rejected critical amount keeps the action closed until a person confirms a corrected value', () => {
    let extraction = extractionFrom();
    const rejected = rejectField(extraction, { field: 'amount_minor', actorId: PERSON, rejectedAt: AT });
    extraction = confirmedValue(rejected);
    expect(extraction.amount_minor.value).toBeNull();
    expect(gateAction(extraction).blockedBy).toContain('rejected:amount_minor');

    extraction = confirmedValue(confirmField(extraction, { field: 'amount_minor', value: 125000, actorId: PERSON, confirmedAt: AT }));
    expect(gateAction(extraction).blockedBy).not.toContain('rejected:amount_minor');
    expect(gateAction(extraction).blockedBy).not.toContain('unconfirmed:amount_minor');
  });

  it('T14 a confirmation needs a person and a valid time, and the gate opens only when all four critical fields are confirmed', () => {
    const extraction = extractionFrom();
    expect(errorsOf(confirmField(extraction, { field: 'amount_minor', value: 125000, actorId: '  ', confirmedAt: AT }))).toContain(
      'actor_required',
    );
    expect(errorsOf(confirmField(extraction, { field: 'amount_minor', value: 125000, actorId: PERSON, confirmedAt: 'không phải thời gian' }))).toContain(
      'confirmed_at_invalid',
    );

    let current = extraction;
    current = confirmedValue(confirmField(current, { field: 'purchase_date', value: '2026-04-03', actorId: PERSON, confirmedAt: AT }));
    current = confirmedValue(confirmField(current, { field: 'amount_minor', value: 125000, actorId: PERSON, confirmedAt: AT }));
    current = confirmedValue(confirmField(current, { field: 'currency', value: 'VND', actorId: PERSON, confirmedAt: AT }));
    expect(gateAction(current).allowed).toBe(false);
    current = confirmedValue(confirmField(current, { field: 'serial', value: 'SN-0001', actorId: PERSON, confirmedAt: AT }));
    expect(gateAction(current)).toEqual({ allowed: true, blockedBy: [] });
  });
});
