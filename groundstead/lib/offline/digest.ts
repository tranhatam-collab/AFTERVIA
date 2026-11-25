// SHA-256 as lowercase hex, computed with WebCrypto. The build and the reader's browser use this one function,
// so a file hashed at build time is compared with the same algorithm on the device.
export async function sha256Hex(input: ArrayBuffer | ArrayBufferView): Promise<string> {
  const view = ArrayBuffer.isView(input)
    ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    : new Uint8Array(input);
  // A copy in a plain ArrayBuffer: WebCrypto takes that type only.
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(view));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
