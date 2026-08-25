import { describe, expect, it } from 'vite-plus/test';

import { VolumeIndicatorElement } from '../volume-indicator-element';
import { VolumeIndicatorFillElement } from '../volume-indicator-fill-element';
import { VolumeIndicatorValueElement } from '../volume-indicator-value-element';

describe('VolumeIndicatorElement', () => {
  it('exposes standalone tag names', () => {
    expect(VolumeIndicatorElement.tagName).toBe('media-volume-indicator');
    expect(VolumeIndicatorFillElement.tagName).toBe('media-volume-indicator-fill');
    expect(VolumeIndicatorValueElement.tagName).toBe('media-volume-indicator-value');
  });
});
