/**
 * Apple's JSON chapters notation — the document an `#EXT-X-SESSION-DATA` tag with `DATA-ID="com.apple.hls.chapters"`
 * points at. An array of chapter entries, each with a required `start-time`, an optional `duration`, and optional
 * `titles` (one per BCP-47 language, `und` for language-neutral), `images` (URLs relative to the document), and
 * free-form `metadata`. Chapters run from their start to the next entry's start unless a `duration` says otherwise; a
 * duration is also how chapters overlap or nest.
 *
 * Pure and DOM-free, and written for a spec-valid document: the types below are Apple's schema, and the parser trusts
 * them. A document that isn't one fails loudly at the caller, which already treats a chapters fetch as best-effort.
 *
 * @see https://developer.apple.com/documentation/http-live-streaming/providing-javascript-object-notation-json-chapters
 */

import { resolveUrl } from './resolve-url';

/** The `DATA-ID` Apple reserves for JSON chapters. */
export const APPLE_HLS_CHAPTERS_DATA_ID = 'com.apple.hls.chapters';

/** One free-form metadata item for a chapter, as authored; `value` is whatever JSON the author put there. */
export interface ChapterMetadata {
  key: string;
  value: unknown;
  language?: string;
}

/** A chapter entry as Apple's schema spells it. */
export interface HlsJsonChapter {
  /** Human-readable chapter number; carries no meaning. */
  chapter?: number;
  'start-time': number;
  duration?: number;
  titles?: { language: string; title: string }[];
  images?: { 'image-category': string; 'pixel-width': number; 'pixel-height': number; url: string }[];
  metadata?: ChapterMetadata[];
}

/** The whole document. */
export type HlsJsonChapters = HlsJsonChapter[];

/** One image for a chapter; `category` groups images of the same kind ("thumbnail", "hd", …) across chapters. */
export interface ChapterImage {
  category: string;
  width: number;
  height: number;
  /** Fully resolved against the chapters document URL. */
  url: string;
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

/**
 * Parse an Apple JSON chapters document, in document order — the order Apple's players display, and the order that
 * decides which entry is "next" for a chapter without a `duration`.
 *
 * @param document - The parsed JSON document
 * @param baseUrl - The document's URL, for resolving relative image URLs
 * @returns The chapters, in document order
 */
export function parseHlsJsonChapters(document: HlsJsonChapters, baseUrl: string): Chapter[] {
  return document.map((entry, index) => {
    const startTime = entry['start-time'];
    const endTime = entry.duration !== undefined ? startTime + entry.duration : document[index + 1]?.['start-time'];
    const chapter: Chapter = {
      startTime,
      titles: Object.fromEntries((entry.titles ?? []).map(({ language, title }) => [language, title])),
    };

    if (endTime !== undefined) chapter.endTime = endTime;

    if (entry.images) {
      chapter.images = entry.images.map((image) => ({
        category: image['image-category'],
        width: image['pixel-width'],
        height: image['pixel-height'],
        url: resolveUrl(image.url, baseUrl),
      }));
    }

    if (entry.metadata) chapter.metadata = entry.metadata;

    return chapter;
  });
}
