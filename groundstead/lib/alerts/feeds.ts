// The feeds the alert job reads (GS-053). One place names them, with what is known about each (see docs/evidence/GS-053.md).
// reuse: whether the source's rights allow showing its content (content/sources.json). When it is false, the public page
// may only link to the source and show structured fields, never copy its text. Owner decision D-36 governs any change.
export const FEEDS = {
  usgs: {
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    format: 'geojson',
    reuse: true,
  },
  gdacs: {
    url: 'https://www.gdacs.org/xml/rss.xml',
    format: 'rss',
    reuse: false,
  },
} as const

export type FeedId = keyof typeof FEEDS
