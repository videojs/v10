import { describe, expect, it } from 'vitest';

import { getSliderTrackClipPath } from '../slider-segments';

describe('getSliderTrackClipPath', () => {
  it('references the slider clip path ID', () => {
    expect(getSliderTrackClipPath('slider-1')).toBe('url("#slider-1-segments")');
  });
});
