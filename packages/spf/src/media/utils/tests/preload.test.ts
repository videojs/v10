import { describe, expect, it } from 'vitest';
import { isStandardPreload } from '../preload';

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
