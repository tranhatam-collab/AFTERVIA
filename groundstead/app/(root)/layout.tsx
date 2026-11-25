import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BRAND } from '../../lib/brand.ts';
import { buildAlternates } from '../../lib/seo/alternates.ts';
import { ChannelBanner } from '../../components/ChannelBanner.tsx';
import '../globals.css';

// "/" is a language chooser. It is never indexed; x-default points to /en/.
export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  title: BRAND.name,
  alternates: { canonical: buildAlternates(BRAND.siteUrl, 'en').languages['x-default'] },
  robots: { index: false, follow: true },
};

export default function RootChooserLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ChannelBanner locale="en" />
        {children}
      </body>
    </html>
  );
}
