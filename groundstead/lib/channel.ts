// The build channel (G-07), chosen by GS_CHANNEL. Unset or empty means production, so a build that forgets the variable
// publishes only checked content. `preview` is set on purpose, for builds that may show drafts: it adds a visible banner
// and labels the structured data. Any other value stops the build instead of guessing.
export const CHANNELS = ['production', 'preview'] as const;
export type Channel = (typeof CHANNELS)[number];

export function channelFrom(env: Record<string, string | undefined> = process.env): Channel {
  const raw = (env.GS_CHANNEL ?? '').trim();
  if (raw === '') return 'production';
  if (raw === 'production' || raw === 'preview') return raw;
  throw new Error(`GS_CHANNEL must be "production" or "preview", not "${raw}"`);
}

// The channel of this build. Only server components and build scripts read it.
export function currentChannel(): Channel {
  return channelFrom(process.env);
}
