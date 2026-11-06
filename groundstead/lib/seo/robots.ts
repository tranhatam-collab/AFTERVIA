// The robots file (GS-081). Everything is blocked unless indexing is allowed for this build; then the sitemap is named.
export function robotsTxt(siteUrl: string, indexing: boolean): string {
  if (!indexing) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.replace(/\/+$/, '')}/sitemap.xml\n`;
}
