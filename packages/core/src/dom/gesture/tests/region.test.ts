import { describe, expect, it } from 'vitest';

import type { GestureRegion } from '../region';
import { resolveRegion } from '../region';

describe('resolveRegion', () => {
  const rect = { left: 0, width: 300 } as DOMRect;

  describe('halves (left + right)', () => {
    const regions = new Set<GestureRegion>(['left', 'right']);

    it('returns left for first half', () => {
      expect(resolveRegion(50, rect, regions)).toBe('left');
      expect(resolveRegion(0, rect, regions)).toBe('left');
      expect(resolveRegion(149, rect, regions)).toBe('left');
    });

    it('returns right for second half', () => {
      expect(resolveRegion(150, rect, regions)).toBe('right');
      expect(resolveRegion(250, rect, regions)).toBe('right');
      expect(resolveRegion(300, rect, regions)).toBe('right');
    });
  });

  describe('thirds (left + center + right)', () => {
    const regions = new Set<GestureRegion>(['left', 'center', 'right']);

    it('returns left for first third', () => {
      expect(resolveRegion(0, rect, regions)).toBe('left');
      expect(resolveRegion(50, rect, regions)).toBe('left');
      expect(resolveRegion(99, rect, regions)).toBe('left');
    });

    it('returns center for middle third', () => {
      expect(resolveRegion(100, rect, regions)).toBe('center');
      expect(resolveRegion(150, rect, regions)).toBe('center');
      expect(resolveRegion(199, rect, regions)).toBe('center');
    });

    it('returns right for last third', () => {
      expect(resolveRegion(200, rect, regions)).toBe('right');
      expect(resolveRegion(250, rect, regions)).toBe('right');
      expect(resolveRegion(300, rect, regions)).toBe('right');
    });
  });

  it('returns null for empty regions', () => {
    expect(resolveRegion(100, rect, new Set())).toBe(null);
  });

  it('returns null for zero-width container', () => {
    const zeroRect = { left: 0, width: 0 } as DOMRect;
    const regions = new Set<GestureRegion>(['left', 'right']);
    expect(resolveRegion(0, zeroRect, regions)).toBe(null);
  });

  it('handles offset container', () => {
    const offsetRect = { left: 100, width: 300 } as DOMRect;
    const regions = new Set<GestureRegion>(['left', 'right']);

    // clientX 100 = left edge → left region
    expect(resolveRegion(100, offsetRect, regions)).toBe('left');
    // clientX 250 = middle → left region (< 50%)
    expect(resolveRegion(249, offsetRect, regions)).toBe('left');
    // clientX 250 = middle → right region (>= 50%)
    expect(resolveRegion(250, offsetRect, regions)).toBe('right');
  });
});
