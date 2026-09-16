import { describe, expect, it } from 'vite-plus/test';

import { VolumeIndicatorElement } from '../element';
import { VolumeIndicatorFillElement } from '../fill';
import { VolumeIndicatorValueElement } from '../value';

describe('VolumeIndicatorElement', () => {
  it('exposes standalone tag names', () => {
    expect(VolumeIndicatorElement.tagName).toBe('media-volume-indicator');
    expect(VolumeIndicatorFillElement.tagName).toBe('media-volume-indicator-fill');
    expect(VolumeIndicatorValueElement.tagName).toBe('media-volume-indicator-value');
  });
});
