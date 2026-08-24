import { describe, expect, it } from 'vitest';
import type { FeedItem } from '../feedItems';
import { buildChannelCustomData, escapeXml, toRfc822, toRssItems } from '../rssFeed';

describe('escapeXml', () => {
  it('escapes every character that would break out of a text node or attribute', () => {
    expect(escapeXml(`<a href="x?a=1&b=2">it's</a>`)).toBe(
      '&lt;a href=&quot;x?a=1&amp;b=2&quot;&gt;it&apos;s&lt;/a&gt;'
    );
  });
});

describe('toRfc822', () => {
  it('formats dates the way RSS expects', () => {
    expect(toRfc822(new Date('2026-08-21T00:00:00Z'))).toBe('Fri, 21 Aug 2026 00:00:00 GMT');
  });
});

describe('buildChannelCustomData', () => {
  const metadata = {
    feedUrl: new URL('https://videojs.org/changelog/rss.xml'),
    jsonFeedUrl: new URL('https://videojs.org/changelog/feed.json'),
    pageUrl: new URL('https://videojs.org/changelog'),
    title: 'Video.js Changelog',
    lastBuildDate: new Date('2026-08-21T00:00:00Z'),
    imageUrl: new URL('https://videojs.org/apple-touch-icon.png'),
    categories: ['Software'],
  };

  it('emits the channel elements @astrojs/rss has no option for', () => {
    const xml = buildChannelCustomData(metadata);

    expect(xml).toContain('<language>en-us</language>');
    expect(xml).toContain(
      '<atom:link href="https://videojs.org/changelog/rss.xml" rel="self" type="application/rss+xml"/>'
    );
    expect(xml).toContain(
      '<atom:link href="https://videojs.org/changelog/feed.json" rel="alternate" type="application/feed+json"/>'
    );
    expect(xml).toContain('<lastBuildDate>Fri, 21 Aug 2026 00:00:00 GMT</lastBuildDate>');
    expect(xml).toContain('<category>Software</category>');
    expect(xml).toContain('<docs>https://www.rssboard.org/rss-specification</docs>');
    expect(xml).toContain(
      '<image><url>https://videojs.org/apple-touch-icon.png</url><title>Video.js Changelog</title><link>https://videojs.org/changelog</link></image>'
    );
  });

  it('ends the copyright range at the newest item, so rebuilds stay reproducible', () => {
    expect(buildChannelCustomData(metadata)).toContain('<copyright>© 2010–2026 Video.js contributors</copyright>');
  });

  it('omits lastBuildDate for an empty feed', () => {
    expect(buildChannelCustomData({ ...metadata, lastBuildDate: undefined })).not.toContain('<lastBuildDate>');
  });
});

describe('toRssItems', () => {
  const item: FeedItem = {
    url: 'https://videojs.org/blog/hello',
    title: 'Hello',
    summary: 'A post.',
    contentHtml: '<p>Hello</p>',
    datePublished: new Date('2026-08-21T00:00:00Z'),
    authors: [{ name: 'Steve Heffernan' }, { name: "Pat O'Neill" }],
    tags: [],
    imageUrl: 'https://videojs.org/og/blog/hello.png',
  };

  it('carries the shared item fields across', () => {
    const [rssItem] = toRssItems([item]);

    expect(rssItem).toMatchObject({
      title: 'Hello',
      description: 'A post.',
      link: 'https://videojs.org/blog/hello',
      content: '<p>Hello</p>',
      pubDate: item.datePublished,
    });
  });

  it('emits one dc:creator per author', () => {
    const [rssItem] = toRssItems([item]);

    expect(rssItem?.customData).toContain('<dc:creator>Steve Heffernan</dc:creator>');
    expect(rssItem?.customData).toContain('<dc:creator>Pat O&apos;Neill</dc:creator>');
  });

  it('offers the card image as media:content, which needs no byte length', () => {
    const [rssItem] = toRssItems([item]);

    expect(rssItem?.customData).toContain(
      '<media:content url="https://videojs.org/og/blog/hello.png" medium="image"/>'
    );
    expect(rssItem?.customData).toContain('<media:thumbnail url="https://videojs.org/og/blog/hello.png"/>');
  });

  it('emits atom:updated only for an edited entry', () => {
    expect(toRssItems([item])[0]?.customData).not.toContain('<atom:updated>');
    expect(toRssItems([{ ...item, dateModified: new Date('2026-08-22T12:00:00Z') }])[0]?.customData).toContain(
      '<atom:updated>2026-08-22T12:00:00.000Z</atom:updated>'
    );
  });

  it('omits categories when an entry has no tags', () => {
    expect(toRssItems([item])[0]?.categories).toBeUndefined();
    expect(toRssItems([{ ...item, tags: ['Release'] }])[0]?.categories).toEqual(['Release']);
  });
});
