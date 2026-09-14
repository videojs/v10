import { describe, expect, it } from 'vite-plus/test';

import { type HlsJsonChapters, parseHlsJsonChapters } from '../parse-json-chapters';

const BASE = 'https://cdn.example.com/assets/a/chapters.json';

// Apple's JSON chapters notation: titles per BCP-47 tag, an optional duration,
// images relative to the document, and free-form metadata.
const DOCUMENT: HlsJsonChapters = [
  {
    chapter: 1,
    'start-time': 0,
    titles: [
      { language: 'und', title: 'Intro' },
      { language: 'es', title: 'Introducción' },
    ],
    images: [{ 'image-category': 'chapter', 'pixel-width': 320, 'pixel-height': 180, url: 'images/ch1.jpg' }],
  },
  {
    chapter: 2,
    'start-time': 30,
    duration: 45,
    titles: [{ language: 'und', title: 'Middle' }],
    metadata: [{ key: 'com.example.tag', value: 'x', language: 'en' }],
  },
  { chapter: 3, 'start-time': 90, titles: [{ language: 'und', title: 'End' }] },
];

describe('parseHlsJsonChapters', () => {
  it('returns an empty list for an empty document', () => {
    expect(parseHlsJsonChapters([], BASE)).toEqual([]);
  });

  it('maps start-time and titles into a language-keyed record', () => {
    const [first] = parseHlsJsonChapters(DOCUMENT, BASE);

    expect(first?.startTime).toBe(0);
    expect(first?.titles).toEqual({ und: 'Intro', es: 'Introducción' });
  });

  it('ends a chapter with a duration at start + duration', () => {
    const [, second] = parseHlsJsonChapters(DOCUMENT, BASE);

    expect(second?.endTime).toBe(75);
  });

  it("ends a chapter without a duration at the next chapter's start", () => {
    const [first] = parseHlsJsonChapters(DOCUMENT, BASE);

    expect(first?.endTime).toBe(30);
  });

  it('leaves the last chapter open when it declares no duration', () => {
    const [, , last] = parseHlsJsonChapters(DOCUMENT, BASE);

    expect(last?.endTime).toBeUndefined();
  });

  it('keeps document order rather than sorting by start-time', () => {
    const chapters = parseHlsJsonChapters([DOCUMENT[2]!, DOCUMENT[0]!], BASE);

    expect(chapters.map((chapter) => chapter.startTime)).toEqual([90, 0]);
    // "Next chapter" is the next entry in the document, per Apple.
    expect(chapters[0]?.endTime).toBe(0);
  });

  it('allows overlapping chapters when durations are present', () => {
    const chapters = parseHlsJsonChapters(
      [
        { 'start-time': 0, duration: 60, titles: [{ language: 'und', title: 'Outer' }] },
        { 'start-time': 30, titles: [{ language: 'und', title: 'Inner' }] },
      ],
      BASE
    );

    expect(chapters[0]?.endTime).toBe(60);
    expect(chapters[1]?.endTime).toBeUndefined();
  });

  it('resolves relative image urls against the document url and keeps absolute ones', () => {
    const chapters = parseHlsJsonChapters(
      [
        {
          'start-time': 0,
          images: [
            { 'image-category': 'chapter', 'pixel-width': 320, 'pixel-height': 180, url: 'images/ch1.jpg' },
            {
              'image-category': 'hd',
              'pixel-width': 1920,
              'pixel-height': 1080,
              url: 'https://img.example.com/ch1.jpg',
            },
          ],
        },
      ],
      BASE
    );

    expect(chapters[0]?.images).toEqual([
      { category: 'chapter', width: 320, height: 180, url: 'https://cdn.example.com/assets/a/images/ch1.jpg' },
      { category: 'hd', width: 1920, height: 1080, url: 'https://img.example.com/ch1.jpg' },
    ]);
  });

  it('passes metadata entries through with their optional language', () => {
    const [, second] = parseHlsJsonChapters(DOCUMENT, BASE);

    expect(second?.metadata).toEqual([{ key: 'com.example.tag', value: 'x', language: 'en' }]);
  });

  it('omits images and metadata when the entry carries none', () => {
    const [, , last] = parseHlsJsonChapters(DOCUMENT, BASE);

    expect(last).toEqual({ startTime: 90, titles: { und: 'End' } });
  });

  it('keeps a chapter with no titles as an empty record so it still bounds its predecessor', () => {
    const chapters = parseHlsJsonChapters(
      [{ 'start-time': 0, titles: [{ language: 'und', title: 'Only' }] }, { 'start-time': 10 }],
      BASE
    );

    expect(chapters[0]?.endTime).toBe(10);
    expect(chapters[1]).toEqual({ startTime: 10, titles: {} });
  });
});
