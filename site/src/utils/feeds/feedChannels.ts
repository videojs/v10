import { SITE_DESCRIPTION, SITE_TITLE } from '@/consts';
import type { JsonFeedMetadata } from './jsonFeed';
import type { RssChannelMetadata } from './rssFeed';

/**
 * Everything two serializations of the same feed have to agree on. Keeping it
 * here is what lets `/rss.xml` and `/feed.json` describe one feed rather than
 * two that drifted apart.
 */
interface FeedChannel {
  title: string;
  description: string;
  categories: string[];
  /** Channel metadata for the RSS serialization, minus the per-build date. */
  rssMetadata(site: URL): Omit<RssChannelMetadata, 'lastBuildDate'>;
  jsonMetadata(site: URL): JsonFeedMetadata;
}

interface FeedChannelPaths {
  title: string;
  description: string;
  /** Page the feed covers. */
  pagePath: string;
  rssPath: string;
  jsonPath: string;
  categories: string[];
}

/** Shared by both feeds; the site has one mark. */
const ICON_PATH = '/apple-touch-icon.png';
const FAVICON_PATH = '/favicon.ico';

function defineFeedChannel(paths: FeedChannelPaths): FeedChannel {
  const { title, description, pagePath, rssPath, jsonPath, categories } = paths;

  return {
    title,
    description,
    categories,
    rssMetadata: (site) => ({
      title,
      categories,
      pageUrl: new URL(pagePath, site),
      feedUrl: new URL(rssPath, site),
      jsonFeedUrl: new URL(jsonPath, site),
      imageUrl: new URL(ICON_PATH, site),
    }),
    jsonMetadata: (site) => ({
      title,
      description,
      pageUrl: new URL(pagePath, site),
      feedUrl: new URL(jsonPath, site),
      iconUrl: new URL(ICON_PATH, site),
      faviconUrl: new URL(FAVICON_PATH, site),
    }),
  };
}

export const BLOG_FEED = defineFeedChannel({
  title: `${SITE_TITLE} Blog`,
  description: SITE_DESCRIPTION,
  pagePath: '/blog',
  rssPath: '/rss.xml',
  jsonPath: '/feed.json',
  categories: ['Software', 'Video'],
});

export const CHANGELOG_FEED = defineFeedChannel({
  title: `${SITE_TITLE} Changelog`,
  description: 'New features, fixes, and improvements in every Video.js release',
  pagePath: '/changelog',
  rssPath: '/changelog/rss.xml',
  jsonPath: '/changelog/feed.json',
  categories: ['Software', 'Video'],
});

/** Every feed the site publishes, for head autodiscovery. */
export const FEED_CHANNELS = [BLOG_FEED, CHANGELOG_FEED];
