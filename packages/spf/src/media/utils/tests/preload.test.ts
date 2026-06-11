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
  describe("default defaultPreload ('metadata')", () => {
    it('treats undefined as non-blocking (falls back to metadata)', () => {
      expect(isBlockingPreload(undefined)).toBe(false);
    });

    it('treats empty string as non-blocking (falls back to metadata)', () => {
      expect(isBlockingPreload('')).toBe(false);
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

  describe('custom defaultPreload', () => {
    it("treats undefined as blocking when defaultPreload is 'none'", () => {
      expect(isBlockingPreload(undefined, 'none')).toBe(true);
      expect(isBlockingPreload('', 'none')).toBe(true);
    });

    it("explicit 'auto' is non-blocking even when defaultPreload is 'none'", () => {
      expect(isBlockingPreload('auto', 'none')).toBe(false);
    });

    it("explicit 'none' is blocking even when defaultPreload is 'auto'", () => {
      expect(isBlockingPreload('none', 'auto')).toBe(true);
    });
  });
});
