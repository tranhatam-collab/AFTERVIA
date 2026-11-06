// The public key that packs must be signed with: Ed25519, raw 32 bytes, base64. It is inlined at build time from
// NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY, so the browser trusts exactly the key the site was built with. Empty means
// that no pack can be accepted.
export const PACK_PUBLIC_KEY: string = process.env.NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY ?? '';
