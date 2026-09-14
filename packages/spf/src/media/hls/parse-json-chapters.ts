/**
 * Apple's JSON chapters notation — the document an `#EXT-X-SESSION-DATA` tag with `DATA-ID="com.apple.hls.chapters"`
 * points at. An array of chapter entries, each with a required `start-time`, an optional `duration`, and optional
 * `titles` (one per BCP-47 language, `und` for language-neutral), `images` (URLs relative to the document), and
 * free-form `metadata`. Chapters run from their start to the next entry's start unless a `duration` says otherwise; a
 * duration is also how chapters overlap or nest.
 *
 * Pure and DOM-free: turns the parsed JSON into {@link Chapter}s in document order. Projecting them onto a media element
 * is the business of the DOM layer.
 *
 * @see https://developer.apple.com/documentation/http-live-streaming/providing-javascript-object-notation-json-chapters
 */

import { isNumber, isPlainObject, isString } from '@videojs/utils/predicate';

import { resolveUrl } from './resolve-url';

/** The `DATA-ID` Apple reserves for JSON chapters. */
export const APPLE_HLS_CHAPTERS_DATA_ID = 'com.apple.hls.chapters';

/** One image for a chapter; `category` groups images of the same kind ("thumbnail", "hd", …) across chapters. */
export interface ChapterImage {
  category: string;
  width: number;
  height: number;
  /** Fully resolved against the chapters document URL. */
  url: string;
}

/** One free-form metadata item for a chapter; `value` is whatever JSON the author put there. */
export interface ChapterMetadata {
  key: string;
  value: unknown;
  language?: string;
}

/** A chapter of the presentation, in presentation seconds. */
export interface Chapter {
  startTime: number;
  /**
   * Absent only for the last chapter when it declares no `duration` — the document has nothing to end it with, so the
   * consumer supplies the presentation's end.
   */
  endTime?: number;
  /** Title per BCP-47 language tag (`und` for language-neutral). Empty when the entry carries none. */
  titles: Record<string, string>;
  images?: ChapterImage[];
  metadata?: ChapterMetadata[];
}

function parseTitles(value: unknown): Record<string, string> {
  const titles: Record<string, string> = {};

  if (!Array.isArray(value)) return titles;

  for (const title of value) {
    if (isPlainObject(title) && isString(title.language) && isString(title.title)) {
      titles[title.language] = title.title;
    }
  }

  return titles;
}

function parseImages(value: unknown[], baseUrl: string): ChapterImage[] {
  const images: ChapterImage[] = [];

  for (const image of value) {
    if (!isPlainObject(image)) continue;

    const category = image['image-category'];
    const width = image['pixel-width'];
    const height = image['pixel-height'];
    const { url } = image;

    if (isString(category) && isNumber(width) && isNumber(height) && isString(url)) {
      images.push({ category, width, height, url: resolveUrl(url, baseUrl) });
    }
  }

  return images;
}

function parseMetadata(value: unknown[]): ChapterMetadata[] {
  const metadata: ChapterMetadata[] = [];

  for (const item of value) {
    if (!isPlainObject(item) || !isString(item.key) || !('value' in item)) continue;

    const entry: ChapterMetadata = { key: item.key, value: item.value };

    if (isString(item.language)) entry.language = item.language;

    metadata.push(entry);
  }

  return metadata;
}

function parseChapter(entry: Record<string, unknown>, startTime: number, baseUrl: string): Chapter {
  const chapter: Chapter = { startTime, titles: parseTitles(entry.titles) };
  const { duration, images, metadata } = entry;

  if (isNumber(duration)) chapter.endTime = startTime + duration;

  if (Array.isArray(images)) chapter.images = parseImages(images, baseUrl);

  if (Array.isArray(metadata)) chapter.metadata = parseMetadata(metadata);

  return chapter;
}

/**
 * Parse an Apple JSON chapters document.
 *
 * Entries that aren't objects with a numeric `start-time` are skipped; everything else is kept in document order — the
 * order Apple's players display, and the order that decides which entry is "next" for a chapter without a `duration`.
 *
 * @param json - The parsed JSON document
 * @param baseUrl - The document's URL, for resolving relative image URLs
 * @returns The chapters, in document order
 */
export function parseHlsJsonChapters(json: unknown, baseUrl: string): Chapter[] {
  if (!Array.isArray(json)) return [];

  const chapters: Chapter[] = [];

  for (const entry of json) {
    if (!isPlainObject(entry)) continue;

    const startTime = entry['start-time'];
    if (!isNumber(startTime)) continue;

    chapters.push(parseChapter(entry, startTime, baseUrl));
  }

  // A chapter without a duration runs until the next one starts; the last such
  // chapter stays open for the consumer to end.
  for (let i = 0; i < chapters.length - 1; i++) {
    const chapter = chapters[i]!;

    if (chapter.endTime === undefined) chapter.endTime = chapters[i + 1]!.startTime;
  }

  return chapters;
}
