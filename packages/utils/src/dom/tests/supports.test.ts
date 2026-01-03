import { describe, expect, it } from 'vitest';

import { supportsAnimationFrame, supportsIdleCallback } from '../supports';

describe('supports', () => {
  describe('supportsAnimationFrame', () => {
    it('returns a boolean', () => {
      const result = supportsAnimationFrame();
      expect(typeof result).toBe('boolean');
    });

    it('returns true in browser environment', () => {
      expect(supportsAnimationFrame()).toBe(true);
    });
  });

  describe('supportsIdleCallback', () => {
    it('returns a boolean', () => {
      const result = supportsIdleCallback();
      // Note: requestIdleCallback may or may not be available in jsdom
      // depending on the version, so we just check it returns a boolean
      expect(typeof result).toBe('boolean');
    });
  });
});
