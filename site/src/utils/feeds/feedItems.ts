import { getCollection, getEntries } from 'astro:content';
import { createFeedContentRenderer } from './feedContent';
import { releaseTags } from './releaseTags';

/** Newest entries only; older ones stay on the site. */
export const FEED_ITEM_LIMIT = 20;

export interface FeedAuthor {
  name: string;
  /** Homepage or primary social profile, when the author lists one. */
  url?: string;
  avatar?: string;
}

/** Release facts a changelog item carries beyond the generic feed fields. */
export interface FeedRelease {
  version: string;
  prerelease: boolean;
  breaking: boolean;
  compareUrl: string;
}

/**
 * One entry, resolved once and serialized to every feed format, so the RSS and
 * JSON feeds cannot drift apart.
 */
export interface FeedItem {
  /** Canonical URL, which doubles as the item's stable identifier. */
  url: string;
  title: string;
  summary: string;
  contentHtml: string;
  datePublished: Date;
  dateModified?: Date;
  authors: FeedAuthor[];
  tags: string[];
  /** Card image shown by readers that support one. */
  imageUrl: string;
  release?: FeedRelease;
}

export async function buildChangelogFeedItems(site: URL): Promise<FeedItem[]> {
  const entries = (await getCollection('changelog'))
    .sort(
      (a, b) =>
        b.data.date.valueOf() - a.data.date.valueOf() ||
        b.data.version.localeCompare(a.data.version, undefined, { numeric: true })
    )
    .slice(0, FEED_ITEM_LIMIT);

  const renderFeedContent = await createFeedContentRenderer(site);
  const items: FeedItem[] = [];

  for (const entry of entries) {
    const url = new URL(`/changelog/${entry.id}`, site).href;
    const content = await renderFeedContent(entry);

    items.push({
      url,
      title: `v${entry.data.version}`,
      summary: entry.data.description,
      // The compare link is part of the release page's header rather than its
      // body, so append it to the feed item instead of losing it.
      contentHtml: `${content}<p><a href="${entry.data.compareUrl}">Compare changes on GitHub</a></p>`,
      datePublished: entry.data.date,
      authors: [],
      tags: releaseTags(entry.data),
      imageUrl: new URL(`/og/changelog/${entry.id}.png`, site).href,
      release: {
        version: entry.data.version,
        prerelease: entry.data.prerelease,
        breaking: entry.data.breaking,
        compareUrl: entry.data.compareUrl,
      },
    });
  }

  return items;
}

export async function buildBlogFeedItems(site: URL, { includeDevOnly = false } = {}): Promise<FeedItem[]> {
  const posts = (await getCollection('blog'))
    .filter((post) => !post.data.devOnly || includeDevOnly)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, FEED_ITEM_LIMIT);

  const renderFeedContent = await createFeedContentRenderer(site);
  const items: FeedItem[] = [];

  for (const post of posts) {
    const authors = await getEntries(post.data.authors);
    const ogImage = post.data.ogImage;

    items.push({
      url: new URL(`/blog/${post.id}`, site).href,
      title: post.data.title,
      summary: post.data.description,
      contentHtml: await renderFeedContent(post),
      datePublished: post.data.pubDate,
      dateModified: post.data.updatedDate,
      authors: authors.map((author) => ({
        name: author.data.name,
        url: author.data.socialLinks?.website ?? author.data.socialLinks?.github,
        avatar: author.data.avatar,
      })),
      tags: [],
      // Falls back to the same generated card the page itself links as its
      // Open Graph image.
      imageUrl: ogImage
        ? new URL(typeof ogImage === 'string' ? ogImage : ogImage.src, site).href
        : new URL(`/og/blog/${post.id}.png`, site).href,
    });
  }

  return items;
}
