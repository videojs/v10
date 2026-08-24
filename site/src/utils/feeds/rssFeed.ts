import type { RSSFeedItem } from '@astrojs/rss';
import type { FeedItem } from './feedItems';

/** Namespaces the feeds borrow for fields RSS 2.0 itself does not define. */
export const RSS_NAMESPACES = {
  atom: 'http://www.w3.org/2005/Atom',
  dc: 'http://purl.org/dc/elements/1.1/',
  media: 'http://search.yahoo.com/mrss/',
};

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/**
 * `customData` is spliced into the feed as raw XML, so anything interpolated
 * into it has to be escaped by hand.
 */
export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character] as string);
}

/** RSS dates are RFC 822, which `toUTCString()` already produces. */
export function toRfc822(date: Date): string {
  return date.toUTCString();
}

export interface RssChannelMetadata {
  /** Absolute URL of the feed itself, for `<atom:link rel="self">`. */
  feedUrl: URL;
  /** Absolute URL of the page the feed covers. */
  pageUrl: URL;
  /** Absolute URL of this feed's JSON Feed counterpart. */
  jsonFeedUrl: URL;
  /** Feed title, reused by `<image>`. */
  title: string;
  /** Newest item date. Preferred over "now" so rebuilds stay reproducible. */
  lastBuildDate?: Date;
  /** Absolute URL of the channel image. */
  imageUrl: URL;
  /** Channel-level categories. */
  categories?: string[];
}

/**
 * Channel-level elements `@astrojs/rss` has no option for. Requires the
 * namespaces in `RSS_NAMESPACES` to be declared via its `xmlns` option.
 */
export function buildChannelCustomData({
  feedUrl,
  pageUrl,
  jsonFeedUrl,
  title,
  lastBuildDate,
  imageUrl,
  categories = [],
}: RssChannelMetadata): string {
  const year = (lastBuildDate ?? new Date()).getUTCFullYear();

  return [
    '<language>en-us</language>',
    `<atom:link href="${escapeXml(feedUrl.href)}" rel="self" type="application/rss+xml"/>`,
    `<atom:link href="${escapeXml(jsonFeedUrl.href)}" rel="alternate" type="application/feed+json"/>`,
    lastBuildDate ? `<lastBuildDate>${toRfc822(lastBuildDate)}</lastBuildDate>` : '',
    ...categories.map((category) => `<category>${escapeXml(category)}</category>`),
    `<copyright>© 2010–${year} Video.js contributors</copyright>`,
    '<docs>https://www.rssboard.org/rss-specification</docs>',
    '<image>',
    `<url>${escapeXml(imageUrl.href)}</url>`,
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(pageUrl.href)}</link>`,
    '</image>',
  ]
    .filter(Boolean)
    .join('');
}

/**
 * Item-level elements RSS 2.0 has no field for:
 *
 * - `dc:creator` for authors. RSS's own `<author>` is defined as an email
 *   address, which the site does not publish.
 * - `atom:updated` for the last-modified date.
 * - `media:content` for the card image readers show alongside the item.
 *   `<enclosure>` would need the image's byte length, which is unknowable for
 *   the on-demand OG endpoint.
 */
function buildItemCustomData(item: FeedItem): string {
  return [
    ...item.authors.map((author) => `<dc:creator>${escapeXml(author.name)}</dc:creator>`),
    item.dateModified ? `<atom:updated>${item.dateModified.toISOString()}</atom:updated>` : '',
    `<media:content url="${escapeXml(item.imageUrl)}" medium="image"/>`,
    `<media:thumbnail url="${escapeXml(item.imageUrl)}"/>`,
  ]
    .filter(Boolean)
    .join('');
}

export function toRssItems(items: FeedItem[]): RSSFeedItem[] {
  return items.map((item) => ({
    title: item.title,
    description: item.summary,
    pubDate: item.datePublished,
    link: item.url,
    content: item.contentHtml,
    categories: item.tags.length > 0 ? item.tags : undefined,
    customData: buildItemCustomData(item),
  }));
}
