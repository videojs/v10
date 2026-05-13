import { describe, expect, it } from 'vitest';
import { isBlockingPreload, isStandardPreload } from '../preload';

describe('isStandardPreload', () => {
  it('accepts the three W3C values', () => {
    expect(isStandardPreload('auto')).toBe(true);
    expect(isStandardPreload('metadata')).toBe(true);
    expect(isStandardPreload('none')).toBe(true);
  });

  it('rejects undefined, empty string, and other strings', () => {
    expect(isStandardPreload(undefined)).toBe(false);
    expect(isStandardPreload('')).toBe(false);
    expect(isStandardPreload('canplay')).toBe(false);
    expect(isStandardPreload('AUTO')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isStandardPreload(null)).toBe(false);
    expect(isStandardPreload(0)).toBe(false);
    expect(isStandardPreload({})).toBe(false);
  });
});

describe('isBlockingPreload', () => {
  describe('default blocklist', () => {
    it('treats undefined as blocking', () => {
      expect(isBlockingPreload(undefined)).toBe(true);
    });

    it('treats empty string as blocking', () => {
      expect(isBlockingPreload('')).toBe(true);
    });

    it("treats 'none' as blocking", () => {
      expect(isBlockingPreload('none')).toBe(true);
    });

    it("treats 'auto' and 'metadata' as non-blocking", () => {
      expect(isBlockingPreload('auto')).toBe(false);
      expect(isBlockingPreload('metadata')).toBe(false);
    });

    it('treats extended (non-W3C) values as non-blocking', () => {
      expect(isBlockingPreload('canplay')).toBe(false);
    });
  });

  describe('custom blocklist', () => {
    it('blocks values in the supplied list', () => {
      expect(isBlockingPreload('canplay', ['none', 'canplay'])).toBe(true);
      expect(isBlockingPreload('metadata', ['metadata'])).toBe(true);
    });

    it("does not block 'none' when the list does not include it", () => {
      expect(isBlockingPreload('none', [])).toBe(false);
    });

    it('still treats falsy preload as blocking regardless of list', () => {
      expect(isBlockingPreload(undefined, [])).toBe(true);
      expect(isBlockingPreload('', ['auto'])).toBe(true);
    });
  });
});
