import { describe, expect, it } from 'vitest';

import { SVTA_NO_SUPPORTED_AUDIO_TRACK, SVTA_NO_SUPPORTED_VIDEO_TRACK, svtaCategory, svtaIndex } from '../errors';

describe('svtaCategory', () => {
  it('reads the category from a four-digit native code', () => {
    expect(svtaCategory(SVTA_NO_SUPPORTED_VIDEO_TRACK)).toBe(2);
    expect(svtaCategory(SVTA_NO_SUPPORTED_AUDIO_TRACK)).toBe(2);
  });

  it('reads the category from a five-digit external code', () => {
    // "03404" — an HTTP 404 embedded under the network category, per the spec's
    // external-standard form. Numerically 3404, so the same arithmetic applies.
    expect(svtaCategory(3404)).toBe(3);
  });

  it('reports category 0 for the fully-unknown code', () => {
    expect(svtaCategory(999)).toBe(0);
  });
});

describe('svtaIndex', () => {
  it('reads the index from a four-digit native code', () => {
    expect(svtaIndex(SVTA_NO_SUPPORTED_VIDEO_TRACK)).toBe(11);
    expect(svtaIndex(SVTA_NO_SUPPORTED_AUDIO_TRACK)).toBe(12);
  });

  it('reads the embedded external code from a five-digit code', () => {
    expect(svtaIndex(3404)).toBe(404);
  });

  it('reads 999 for the fully-unknown code', () => {
    expect(svtaIndex(999)).toBe(999);
  });
});
