import { describe, expect, it } from 'vitest';
import { DashMedia, isDashMedia } from '..';

describe('isDashMedia', () => {
  it('recognizes DashMedia by its symbol marker', () => {
    const media = new DashMedia();

    expect(isDashMedia(media)).toBe(true);
    expect(isDashMedia({})).toBe(false);
    expect(isDashMedia(null)).toBe(false);
  });
});
