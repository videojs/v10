import { describe, expect, it } from 'vitest';
import type { FeedItem } from '../feedItems';
import { buildJsonFeed } from '../jsonFeed';

const METADATA = {
  title: 'Video.js Changelog',
  description: 'New features, fixes, and improvements in every Video.js release',
  pageUrl: new URL('https://videojs.org/changelog'),
  feedUrl: new URL('https://videojs.org/changelog/feed.json'),
  iconUrl: new URL('https://videojs.org/apple-touch-icon.png'),
  faviconUrl: new URL('https://videojs.org/favicon.ico'),
};

const POST: FeedItem = {
  url: 'https://videojs.org/blog/hello',
  title: 'Hello',
  summary: 'A post.',
  contentHtml: '<p>Hello</p>',
  datePublished: new Date('2026-08-21T00:00:00Z'),
  authors: [{ name: 'Steve Heffernan', url: 'https://github.com/heff', avatar: 'https://github.com/heff.png' }],
  tags: [],
  imageUrl: 'https://videojs.org/og/blog/hello.png',
};

const RELEASE: FeedItem = {
  url: 'https://videojs.org/changelog/10.0.0-beta.31',
  title: 'v10.0.0-beta.31',
  summary: 'Adds right-to-left player support.',
  contentHtml: '<p>RTL</p>',
  datePublished: new Date('2026-08-21T00:00:00Z'),
  authors: [],
  tags: ['Release', 'Prerelease'],
  imageUrl: 'https://videojs.org/og/changelog/10.0.0-beta.31.png',
  release: {
    version: '10.0.0-beta.31',
    prerelease: true,
    breaking: false,
    compareUrl: 'https://github.com/videojs/v10/compare/a...b',
  },
};

describe('buildJsonFeed', () => {
  it('describes the channel per JSON Feed 1.1', () => {
    expect(buildJsonFeed(METADATA, [])).toEqual({
      version: 'https://jsonfeed.org/version/1.1',
      title: 'Video.js Changelog',
      description: 'New features, fixes, and improvements in every Video.js release',
      home_page_url: 'https://videojs.org/changelog',
      feed_url: 'https://videojs.org/changelog/feed.json',
      icon: 'https://videojs.org/apple-touch-icon.png',
      favicon: 'https://videojs.org/favicon.ico',
      language: 'en-us',
      items: [],
    });
  });

  it('uses the canonical URL as the id readers dedupe on', () => {
    const [item] = buildJsonFeed(METADATA, [POST]).items;

    expect(item?.id).toBe('https://videojs.org/blog/hello');
    expect(item?.url).toBe('https://videojs.org/blog/hello');
  });

  it('carries content, summary, dates, and the card image', () => {
    const [item] = buildJsonFeed(METADATA, [{ ...POST, dateModified: new Date('2026-08-22T12:00:00Z') }]).items;

    expect(item).toMatchObject({
      title: 'Hello',
      summary: 'A post.',
      content_html: '<p>Hello</p>',
      date_published: '2026-08-21T00:00:00.000Z',
      date_modified: '2026-08-22T12:00:00.000Z',
      image: 'https://videojs.org/og/blog/hello.png',
    });
  });

  it('includes author profiles, which RSS has nowhere to put', () => {
    const [item] = buildJsonFeed(METADATA, [POST]).items;

    expect(item?.authors).toEqual([
      { name: 'Steve Heffernan', url: 'https://github.com/heff', avatar: 'https://github.com/heff.png' },
    ]);
  });

  it('omits optional fields rather than emitting empty ones', () => {
    const [item] = buildJsonFeed(METADATA, [POST]).items;

    expect(item).not.toHaveProperty('date_modified');
    expect(item).not.toHaveProperty('tags');
    expect(item).not.toHaveProperty('_videojs');
  });

  it('exposes release facts as a namespaced extension', () => {
    const [item] = buildJsonFeed(METADATA, [RELEASE]).items;

    expect(item?.tags).toEqual(['Release', 'Prerelease']);
    expect(item?._videojs).toEqual({
      version: '10.0.0-beta.31',
      prerelease: true,
      breaking: false,
      compare_url: 'https://github.com/videojs/v10/compare/a...b',
    });
  });
});
