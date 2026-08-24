import type { FeedAuthor, FeedItem } from './feedItems';

/** https://www.jsonfeed.org/version/1.1/ */
const JSON_FEED_VERSION = 'https://jsonfeed.org/version/1.1';

interface JsonFeedAuthor {
  name: string;
  url?: string;
  avatar?: string;
}

interface JsonFeedItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  content_html: string;
  date_published: string;
  date_modified?: string;
  authors?: JsonFeedAuthor[];
  tags?: string[];
  image?: string;
  /** Namespaced extension carrying the release facts RSS puts in categories. */
  _videojs?: {
    version: string;
    prerelease: boolean;
    breaking: boolean;
    compare_url: string;
  };
}

interface JsonFeed {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  description: string;
  icon: string;
  favicon: string;
  language: string;
  items: JsonFeedItem[];
}

export interface JsonFeedMetadata {
  title: string;
  description: string;
  /** Absolute URL of the page the feed covers. */
  pageUrl: URL;
  /** Absolute URL of the feed itself. */
  feedUrl: URL;
  /** Large square icon, per the spec's "at least 512x512" guidance. */
  iconUrl: URL;
  faviconUrl: URL;
}

function toJsonFeedAuthor({ name, url, avatar }: FeedAuthor): JsonFeedAuthor {
  return { name, ...(url ? { url } : {}), ...(avatar ? { avatar } : {}) };
}

function toJsonFeedItem(item: FeedItem): JsonFeedItem {
  return {
    // The canonical URL is stable across edits and re-releases, so it doubles
    // as the id readers dedupe on.
    id: item.url,
    url: item.url,
    title: item.title,
    summary: item.summary,
    content_html: item.contentHtml,
    date_published: item.datePublished.toISOString(),
    ...(item.dateModified ? { date_modified: item.dateModified.toISOString() } : {}),
    ...(item.authors.length > 0 ? { authors: item.authors.map(toJsonFeedAuthor) } : {}),
    ...(item.tags.length > 0 ? { tags: item.tags } : {}),
    image: item.imageUrl,
    ...(item.release
      ? {
          _videojs: {
            version: item.release.version,
            prerelease: item.release.prerelease,
            breaking: item.release.breaking,
            compare_url: item.release.compareUrl,
          },
        }
      : {}),
  };
}

export function buildJsonFeed(
  { title, description, pageUrl, feedUrl, iconUrl, faviconUrl }: JsonFeedMetadata,
  items: FeedItem[]
): JsonFeed {
  return {
    version: JSON_FEED_VERSION,
    title,
    home_page_url: pageUrl.href,
    feed_url: feedUrl.href,
    description,
    icon: iconUrl.href,
    favicon: faviconUrl.href,
    language: 'en-us',
    items: items.map(toJsonFeedItem),
  };
}

/**
 * JSON Feed's own media type, which readers use for autodiscovery.
 *
 * This covers `astro dev`. In a build these routes prerender to static files
 * that the CDN serves by extension, so `netlify.toml` sets the same header for
 * the built `/feed.json` paths — keep the two in step.
 */
export const JSON_FEED_CONTENT_TYPE = 'application/feed+json; charset=utf-8';

export function jsonFeedResponse(feed: JsonFeed): Response {
  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'content-type': JSON_FEED_CONTENT_TYPE },
  });
}
