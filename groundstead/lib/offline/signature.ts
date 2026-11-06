import type { PackFile } from './verify.ts';

// What an Ed25519 signature covers: every manifest field except the signature fields (GS-022).
export type PackBody = { id: string; version: string; updated: string; files: PackFile[] };

// Fixed key order and only the listed fields, so the build (Node) and the reader's browser make the same bytes.
export function canonicalBytes(body: PackBody): Uint8Array<ArrayBuffer> {
  const text = JSON.stringify({
    id: body.id,
    version: body.version,
    updated: body.updated,
    files: body.files.map((file) => ({ path: file.path, sha256: file.sha256, size: file.size })),
  });
  return new TextEncoder().encode(text);
}

// Bytes of a standard base64 string, or null when the text is not valid base64.
export function base64ToBytes(text: string): Uint8Array<ArrayBuffer> | null {
  if (text.length === 0 || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return null;
  try {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

// True only when the signature is a valid Ed25519 signature of the body under the given public key. A missing key or
// signature, or one that is not valid base64, is false.
export async function verifySignature(
  body: PackBody,
  signature: string | null | undefined,
  publicKey: string | null | undefined,
): Promise<boolean> {
  if (!signature || !publicKey) return false;
  const sig = base64ToBytes(signature);
  const raw = base64ToBytes(publicKey);
  if (!sig || !raw || raw.byteLength !== 32) return false;
  try {
    const key = await crypto.subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, sig, canonicalBytes(body));
  } catch {
    return false;
  }
}
