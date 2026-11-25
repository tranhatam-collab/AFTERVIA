import { currentChannel } from '../lib/channel.ts';
import type { Locale } from '../lib/i18n/locales.ts';
import { MESSAGES } from '../lib/i18n/messages.ts';

// Shown at the top of every page of a preview build, and nowhere else (G-07). Production renders nothing.
export function ChannelBanner({ locale }: { locale: Locale }) {
  if (currentChannel() !== 'preview') return null;
  return <p className="notice channel-banner">{MESSAGES[locale].previewBanner}</p>;
}
