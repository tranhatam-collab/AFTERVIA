// Synthetic GDACS RSS items for the alert tests (GS-053). The element names are the ones the live GDACS feed uses
// (checked on 06/11/2026, structure only). Titles, names and values are written for these tests and copy nothing from
// the feed. The access level "Restricted" is a test value: anything other than "Public" must stay out of the public list.

export const GDACS_SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:gdacs="http://www.gdacs.org" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#"><channel>
<item>
<title>Sample flood item</title>
<link>https://www.gdacs.org/report.aspx?eventtype=FL&amp;eventid=1001</link>
<gdacs:datemodified>Fri, 06 Nov 2026 08:00:00 GMT</gdacs:datemodified>
<gdacs:fromdate>Fri, 06 Nov 2026 06:00:00 GMT</gdacs:fromdate>
<gdacs:iscurrent>true</gdacs:iscurrent>
<gdacs:eventtype>FL</gdacs:eventtype>
<gdacs:eventid>1001</gdacs:eventid>
<gdacs:alertlevel>Orange</gdacs:alertlevel>
<gdacs:eventname>Example</gdacs:eventname>
<gdacs:accesslevel>Public</gdacs:accesslevel>
<geo:lat>21.1</geo:lat>
<geo:long>105.9</geo:long>
</item>
<item>
<title>Sample earthquake item, no longer current</title>
<link>https://www.gdacs.org/report.aspx?eventtype=EQ&amp;eventid=77</link>
<gdacs:datemodified>Thu, 05 Nov 2026 02:00:00 GMT</gdacs:datemodified>
<gdacs:fromdate>Thu, 05 Nov 2026 01:00:00 GMT</gdacs:fromdate>
<gdacs:iscurrent>false</gdacs:iscurrent>
<gdacs:eventtype>EQ</gdacs:eventtype>
<gdacs:eventid>77</gdacs:eventid>
<gdacs:alertlevel>Green</gdacs:alertlevel>
<gdacs:eventname>Old</gdacs:eventname>
<gdacs:accesslevel>Public</gdacs:accesslevel>
<geo:lat>10.8</geo:lat>
<geo:long>106.6</geo:long>
</item>
<item>
<title>Sample restricted item</title>
<gdacs:datemodified>Fri, 06 Nov 2026 07:00:00 GMT</gdacs:datemodified>
<gdacs:fromdate>Fri, 06 Nov 2026 07:00:00 GMT</gdacs:fromdate>
<gdacs:iscurrent>true</gdacs:iscurrent>
<gdacs:eventtype>WF</gdacs:eventtype>
<gdacs:eventid>5</gdacs:eventid>
<gdacs:alertlevel>Green</gdacs:alertlevel>
<gdacs:accesslevel>Restricted</gdacs:accesslevel>
</item>
<item>
<gdacs:eventtype>TC</gdacs:eventtype>
<gdacs:datemodified>Fri, 06 Nov 2026 07:00:00 GMT</gdacs:datemodified>
<gdacs:fromdate>Fri, 06 Nov 2026 07:00:00 GMT</gdacs:fromdate>
</item>
</channel></rss>`

// One current earthquake near Hanoi, the same quake that the USGS sample reports (see alerts-events.test.ts).
export const QUAKE_HANOI_GDACS = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:gdacs="http://www.gdacs.org" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#"><channel>
<item>
<title>Sample earthquake item near Hanoi</title>
<link>https://www.gdacs.org/report.aspx?eventtype=EQ&amp;eventid=9</link>
<gdacs:datemodified>Fri, 06 Nov 2026 09:40:00 GMT</gdacs:datemodified>
<gdacs:fromdate>Fri, 06 Nov 2026 09:00:00 GMT</gdacs:fromdate>
<gdacs:iscurrent>true</gdacs:iscurrent>
<gdacs:eventtype>EQ</gdacs:eventtype>
<gdacs:eventid>9</gdacs:eventid>
<gdacs:alertlevel>Green</gdacs:alertlevel>
<gdacs:eventname>Hanoi</gdacs:eventname>
<gdacs:accesslevel>Public</gdacs:accesslevel>
<geo:lat>21.1</geo:lat>
<geo:long>105.9</geo:long>
</item>
</channel></rss>`
