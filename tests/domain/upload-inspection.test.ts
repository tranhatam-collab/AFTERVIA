import { describe, expect, it } from 'vitest';
import { UPLOAD_LIMITS, detectSignature, inspectUpload } from '@aftervia/domain';

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const PDF = new TextEncoder().encode('%PDF-1.7\n%âãÏÓ\n');
const EXE = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
const ZIP = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);

describe('WO05-02 signature and size inspection', () => {
  it('T09 a JPEG, PNG or PDF whose bytes match its declared type is held for a scanner, never marked clean', () => {
    const cases = [
      { declaredMime: 'image/jpeg', head: JPEG },
      { declaredMime: 'image/png', head: PNG },
      { declaredMime: 'application/pdf', head: PDF },
    ];
    for (const { declaredMime, head } of cases) {
      const verdict = inspectUpload({ declaredMime, sizeBytes: 4096, head });
      expect(verdict).toEqual({ scanStatus: 'SCANNER_UNAVAILABLE', detectedMime: declaredMime, reason: 'scanner_unavailable' });
    }
  });

  it('T09 a PNG declared as JPEG is quarantined as a MIME mismatch', () => {
    expect(inspectUpload({ declaredMime: 'image/jpeg', sizeBytes: 4096, head: PNG })).toEqual({
      scanStatus: 'QUARANTINED',
      detectedMime: 'image/png',
      reason: 'mime_mismatch',
    });
  });

  it('T09 a PDF declared as PNG is quarantined as a MIME mismatch', () => {
    expect(inspectUpload({ declaredMime: 'image/png', sizeBytes: 4096, head: PDF })).toEqual({
      scanStatus: 'QUARANTINED',
      detectedMime: 'application/pdf',
      reason: 'mime_mismatch',
    });
  });

  it('T09 an executable or archive disguised as a PDF is quarantined as an unknown signature', () => {
    for (const head of [EXE, ZIP]) {
      expect(inspectUpload({ declaredMime: 'application/pdf', sizeBytes: 4096, head })).toEqual({
        scanStatus: 'QUARANTINED',
        detectedMime: null,
        reason: 'unknown_signature',
      });
    }
  });

  it('T09 an empty upload or one over 10 MiB is rejected, and exactly 10 MiB is still inspected', () => {
    expect(inspectUpload({ declaredMime: 'application/pdf', sizeBytes: 0, head: PDF })).toMatchObject({
      scanStatus: 'REJECTED',
      reason: 'size_out_of_range',
    });
    expect(inspectUpload({ declaredMime: 'application/pdf', sizeBytes: UPLOAD_LIMITS.maxBytes + 1, head: PDF })).toMatchObject({
      scanStatus: 'REJECTED',
      reason: 'size_out_of_range',
    });
    expect(inspectUpload({ declaredMime: 'application/pdf', sizeBytes: UPLOAD_LIMITS.maxBytes, head: PDF })).toMatchObject({
      scanStatus: 'SCANNER_UNAVAILABLE',
    });
  });

  it('T09 a head shorter than the signature is quarantined, not guessed', () => {
    expect(inspectUpload({ declaredMime: 'image/jpeg', sizeBytes: 2, head: Uint8Array.from([0xff, 0xd8]) })).toMatchObject({
      scanStatus: 'QUARANTINED',
      reason: 'unknown_signature',
    });
    expect(detectSignature(new Uint8Array())).toBeNull();
  });

  it('T09 a declared type outside the allowed list is rejected before any byte is read', () => {
    expect(inspectUpload({ declaredMime: 'image/gif', sizeBytes: 4096, head: PNG })).toEqual({
      scanStatus: 'REJECTED',
      detectedMime: null,
      reason: 'declared_mime_not_allowed',
    });
  });
});
