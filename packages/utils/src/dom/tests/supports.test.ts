import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { supportsAnimationFrame, supportsConstructableStyleSheets, supportsIdleCallback } from '../supports';

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

  describe('supportsConstructableStyleSheets', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns true when CSSStyleSheet can be constructed', () => {
      expect(supportsConstructableStyleSheets()).toBe(true);
    });

    it('returns false when CSSStyleSheet is missing', () => {
      vi.stubGlobal('CSSStyleSheet', undefined);

      expect(supportsConstructableStyleSheets()).toBe(false);
    });

    it('returns false when constructing CSSStyleSheet throws', () => {
      vi.stubGlobal(
        'CSSStyleSheet',
        class {
          constructor() {
            throw new TypeError('Illegal constructor');
          }
        }
      );

      expect(supportsConstructableStyleSheets()).toBe(false);
    });
  });
});
