import { describe, expect, it } from 'vitest';

import { ThumbnailCore } from '../thumbnail-core';
import type { ThumbnailImage } from '../types';

function createImage(overrides: Partial<ThumbnailImage> = {}): ThumbnailImage {
  return {
    url: 'sprite.jpg',
    startTime: 0,
    endTime: 5,
    width: 256,
    height: 160,
    coords: { x: 0, y: 0 },
    ...overrides,
  };
}

function createTimeline(count: number, interval = 5): ThumbnailImage[] {
  const images: ThumbnailImage[] = [];
  const cols = 10;
  const tileW = 256;
  const tileH = 160;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    images.push(
      createImage({
        startTime: i * interval,
        endTime: (i + 1) * interval,
        coords: { x: col * tileW, y: row * tileH },
      })
    );
  }

  return images;
}

describe('ThumbnailCore', () => {
  describe('findActiveThumbnail', () => {
    it('returns undefined for empty array', () => {
      const core = new ThumbnailCore();
      expect(core.findActiveThumbnail([], 5)).toBeUndefined();
    });

    it('finds the first thumbnail at time 0', () => {
      const core = new ThumbnailCore();
      const images = createTimeline(3);

      expect(core.findActiveThumbnail(images, 0)).toBe(images[0]);
    });

    it('finds thumbnail matching the exact start time', () => {
      const core = new ThumbnailCore();
      const images = createTimeline(3);

      expect(core.findActiveThumbnail(images, 5)).toBe(images[1]);
      expect(core.findActiveThumbnail(images, 10)).toBe(images[2]);
    });

    it('finds thumbnail within a time range', () => {
      const core = new ThumbnailCore();
      const images = createTimeline(3);

      expect(core.findActiveThumbnail(images, 2.5)).toBe(images[0]);
      expect(core.findActiveThumbnail(images, 7)).toBe(images[1]);
      expect(core.findActiveThumbnail(images, 12)).toBe(images[2]);
    });

    it('clamps to last thumbnail for time past all end times', () => {
      const core = new ThumbnailCore();
      const images = createTimeline(3);

      expect(core.findActiveThumbnail(images, 15)).toBe(images[2]);
      expect(core.findActiveThumbnail(images, 100)).toBe(images[2]);
    });

    it('returns undefined for negative time', () => {
      const core = new ThumbnailCore();
      const images = createTimeline(3);

      expect(core.findActiveThumbnail(images, -1)).toBeUndefined();
    });

    it('handles thumbnails without endTime', () => {
      const core = new ThumbnailCore();
      const images: ThumbnailImage[] = [
        { url: 'sprite.jpg', startTime: 0, width: 256, height: 160, coords: { x: 0, y: 0 } },
        { url: 'sprite.jpg', startTime: 5, width: 256, height: 160, coords: { x: 0, y: 0 } },
        { url: 'sprite.jpg', startTime: 10, width: 256, height: 160, coords: { x: 0, y: 0 } },
      ];

      expect(core.findActiveThumbnail(images, 0)).toBe(images[0]);
      expect(core.findActiveThumbnail(images, 7)).toBe(images[1]);
      expect(core.findActiveThumbnail(images, 999)).toBe(images[2]);
    });

    it('handles large datasets efficiently', () => {
      const core = new ThumbnailCore();
      const images = createTimeline(1000, 1);

      const result = core.findActiveThumbnail(images, 500.5);

      expect(result).toBe(images[500]);
    });
  });

  describe('calculateScale', () => {
    it('returns 1 when no constraints apply', () => {
      const core = new ThumbnailCore();

      expect(
        core.calculateScale(256, 160, { minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity })
      ).toBe(1);
    });

    it('scales down to fit max-width', () => {
      const core = new ThumbnailCore();

      const scale = core.calculateScale(256, 160, {
        minWidth: 0,
        maxWidth: 128,
        minHeight: 0,
        maxHeight: Infinity,
      });

      expect(scale).toBe(0.5);
    });

    it('scales down to fit max-height', () => {
      const core = new ThumbnailCore();

      const scale = core.calculateScale(256, 160, {
        minWidth: 0,
        maxWidth: Infinity,
        minHeight: 0,
        maxHeight: 80,
      });

      expect(scale).toBe(0.5);
    });

    it('uses the smaller ratio when both max constraints apply', () => {
      const core = new ThumbnailCore();

      const scale = core.calculateScale(256, 160, {
        minWidth: 0,
        maxWidth: 128,
        minHeight: 0,
        maxHeight: 40,
      });

      // min(128/256, 40/160) = min(0.5, 0.25) = 0.25
      expect(scale).toBe(0.25);
    });

    it('scales up to meet min-width', () => {
      const core = new ThumbnailCore();

      const scale = core.calculateScale(100, 50, {
        minWidth: 200,
        maxWidth: Infinity,
        minHeight: 0,
        maxHeight: Infinity,
      });

      expect(scale).toBe(2);
    });

    it('does not scale when tile already fits within constraints', () => {
      const core = new ThumbnailCore();

      const scale = core.calculateScale(256, 160, {
        minWidth: 0,
        maxWidth: 512,
        minHeight: 0,
        maxHeight: 320,
      });

      expect(scale).toBe(1);
    });
  });

  describe('resize', () => {
    it('returns container and image dimensions for sprite thumbnail', () => {
      const core = new ThumbnailCore();
      const thumbnail = createImage({ coords: { x: 512, y: 320 } });
      const noConstraints = { minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity };

      const result = core.resize(thumbnail, 2560, 1600, noConstraints);

      expect(result).toEqual({
        scale: 1,
        containerWidth: 256,
        containerHeight: 160,
        imageWidth: 2560,
        imageHeight: 1600,
        offsetX: 512,
        offsetY: 320,
      });
    });

    it('returns zero offsets for first tile', () => {
      const core = new ThumbnailCore();
      const thumbnail = createImage({ coords: { x: 0, y: 0 } });
      const noConstraints = { minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity };

      const result = core.resize(thumbnail, 2560, 1600, noConstraints);

      expect(result).toMatchObject({ offsetX: 0, offsetY: 0 });
    });

    it('scales all dimensions uniformly when constrained', () => {
      const core = new ThumbnailCore();
      const thumbnail = createImage({ coords: { x: 512, y: 320 } });

      const result = core.resize(thumbnail, 2560, 1600, {
        minWidth: 0,
        maxWidth: 128,
        minHeight: 0,
        maxHeight: Infinity,
      });

      // scale = 128/256 = 0.5
      expect(result).toEqual({
        scale: 0.5,
        containerWidth: 128,
        containerHeight: 80,
        imageWidth: 1280,
        imageHeight: 800,
        offsetX: 256,
        offsetY: 160,
      });
    });

    it('handles individual images without coords', () => {
      const core = new ThumbnailCore();
      const thumbnail: ThumbnailImage = { url: 'thumb.jpg', startTime: 0, endTime: 5 };
      const noConstraints = { minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity };

      const result = core.resize(thumbnail, 320, 180, noConstraints);

      expect(result).toEqual({
        scale: 1,
        containerWidth: 320,
        containerHeight: 180,
        imageWidth: 320,
        imageHeight: 180,
        offsetX: 0,
        offsetY: 0,
      });
    });

    it('returns undefined when dimensions are unavailable', () => {
      const core = new ThumbnailCore();
      const thumbnail: ThumbnailImage = { url: 'thumb.jpg', startTime: 0, endTime: 5 };

      expect(
        core.resize(thumbnail, 0, 0, { minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity })
      ).toBeUndefined();
    });
  });

  describe('getState', () => {
    it('returns loading state', () => {
      const core = new ThumbnailCore();
      const state = core.getState(true, false, undefined);

      expect(state).toEqual({ loading: true, error: false, hidden: false });
    });

    it('returns error state', () => {
      const core = new ThumbnailCore();
      const state = core.getState(false, true, undefined);

      expect(state).toEqual({ loading: false, error: true, hidden: true });
    });

    it('returns hidden when no thumbnail and not loading', () => {
      const core = new ThumbnailCore();
      const state = core.getState(false, false, undefined);

      expect(state).toEqual({ loading: false, error: false, hidden: true });
    });

    it('returns visible when thumbnail exists', () => {
      const core = new ThumbnailCore();
      const state = core.getState(false, false, createImage());

      expect(state).toEqual({ loading: false, error: false, hidden: false });
    });
  });

  describe('getAttrs', () => {
    it('returns role img and aria-hidden', () => {
      const core = new ThumbnailCore();
      const state = core.getState(false, false, createImage());
      const attrs = core.getAttrs(state);

      expect(attrs.role).toBe('img');
      expect(attrs['aria-hidden']).toBe('true');
    });
  });
});
