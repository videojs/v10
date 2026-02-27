import { describe, expect, it } from 'vitest';

import { mapCuesToThumbnails, parseMediaFragment } from '../thumbnail-media-fragment';

describe('parseMediaFragment', () => {
  it('parses url#xywh=x,y,w,h', () => {
    const result = parseMediaFragment('sprite.jpg#xywh=0,0,256,160');

    expect(result.url).toBe('sprite.jpg');
    expect(result.width).toBe(256);
    expect(result.height).toBe(160);
    expect(result.coords).toEqual({ x: 0, y: 0 });
  });

  it('returns url without fragment when no hash present', () => {
    const result = parseMediaFragment('thumb-001.jpg');

    expect(result.url).toBe('thumb-001.jpg');
    expect(result.width).toBeUndefined();
    expect(result.height).toBeUndefined();
    expect(result.coords).toBeUndefined();
  });

  it('resolves relative URLs against baseURL', () => {
    const result = parseMediaFragment('sprite.jpg#xywh=0,0,256,160', 'https://cdn.example.com/media/thumbnails.vtt');

    expect(result.url).toBe('https://cdn.example.com/media/sprite.jpg');
  });

  it('handles absolute URLs in cue text', () => {
    const result = parseMediaFragment(
      'https://cdn.example.com/sprite.jpg#xywh=0,0,256,160',
      'https://other.com/thumbnails.vtt'
    );

    expect(result.url).toBe('https://cdn.example.com/sprite.jpg');
  });

  it('handles hash without key=value', () => {
    const result = parseMediaFragment('sprite.jpg#fragment');

    expect(result.url).toBe('sprite.jpg');
    expect(result.coords).toBeUndefined();
  });

  it('parses non-zero coordinates', () => {
    const result = parseMediaFragment('sprite.jpg#xywh=512,320,256,160');

    expect(result.coords).toEqual({ x: 512, y: 320 });
    expect(result.width).toBe(256);
    expect(result.height).toBe(160);
  });
});

describe('mapCuesToThumbnails', () => {
  it('maps text cues to ThumbnailImage array', () => {
    const cues = [
      { startTime: 0, endTime: 5, text: 'sprite.jpg#xywh=0,0,256,160' },
      { startTime: 5, endTime: 10, text: 'sprite.jpg#xywh=256,0,256,160' },
    ];

    const images = mapCuesToThumbnails(cues);

    expect(images).toHaveLength(2);
    expect(images[0]).toEqual({
      url: 'sprite.jpg',
      startTime: 0,
      endTime: 5,
      width: 256,
      height: 160,
      coords: { x: 0, y: 0 },
    });
    expect(images[1]!.coords).toEqual({ x: 256, y: 0 });
  });

  it('resolves relative URLs against baseURL', () => {
    const cues = [{ startTime: 0, endTime: 5, text: 'sprite.jpg#xywh=0,0,256,160' }];

    const images = mapCuesToThumbnails(cues, 'https://cdn.example.com/media/thumbnails.vtt');

    expect(images[0]!.url).toBe('https://cdn.example.com/media/sprite.jpg');
  });

  it('handles individual images without fragments', () => {
    const cues = [
      { startTime: 0, endTime: 5, text: 'thumb-001.jpg' },
      { startTime: 5, endTime: 10, text: 'thumb-002.jpg' },
    ];

    const images = mapCuesToThumbnails(cues);

    expect(images).toHaveLength(2);
    expect(images[0]!.url).toBe('thumb-001.jpg');
    expect(images[0]!.coords).toBeUndefined();
  });
});
