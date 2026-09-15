import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import {
  supportsAnchorPositioning,
  supportsAnimationFrame,
  supportsIdleCallback,
  supportsPopoverAPI,
} from '../supports';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('supports', () => {
  describe('supportsAnimationFrame', () => {
    it('returns true when requestAnimationFrame is callable', () => {
      vi.stubGlobal('requestAnimationFrame', vi.fn());

      expect(supportsAnimationFrame()).toBe(true);
    });

    it('returns false when requestAnimationFrame is unavailable', () => {
      vi.stubGlobal('requestAnimationFrame', undefined);

      expect(supportsAnimationFrame()).toBe(false);
    });
  });

  describe('supportsIdleCallback', () => {
    it('returns true when requestIdleCallback is callable', () => {
      vi.stubGlobal('requestIdleCallback', vi.fn());

      expect(supportsIdleCallback()).toBe(true);
    });

    it('returns false when requestIdleCallback is unavailable', () => {
      vi.stubGlobal('requestIdleCallback', undefined);

      expect(supportsIdleCallback()).toBe(false);
    });
  });

  describe('supportsAnchorPositioning', () => {
    it('queries CSS support for anchor positioning', () => {
      const supports = vi.fn().mockReturnValue(true);

      vi.stubGlobal('CSS', { supports });

      expect(supportsAnchorPositioning()).toBe(true);
      expect(supports).toHaveBeenCalledExactlyOnceWith('anchor-name: --a');
    });

    it('returns false when CSS is unavailable', () => {
      vi.stubGlobal('CSS', undefined);

      expect(supportsAnchorPositioning()).toBe(false);
    });
  });

  describe('supportsPopoverAPI', () => {
    it('returns true when HTMLElement exposes popover', () => {
      class MockHTMLElement {}

      Object.defineProperty(MockHTMLElement.prototype, 'popover', { configurable: true, value: '' });
      vi.stubGlobal('HTMLElement', MockHTMLElement);

      expect(supportsPopoverAPI()).toBe(true);
    });

    it('returns false when HTMLElement does not expose popover', () => {
      vi.stubGlobal('HTMLElement', class {});

      expect(supportsPopoverAPI()).toBe(false);
    });
  });
});
