import { describe, expect, it } from 'vite-plus/test';

import { SeekIndicatorElement } from '../element';
import { SeekIndicatorValueElement } from '../value';

describe('SeekIndicatorElement', () => {
  it('exposes standalone tag names', () => {
    expect(SeekIndicatorElement.tagName).toBe('media-seek-indicator');
    expect(SeekIndicatorValueElement.tagName).toBe('media-seek-indicator-value');
  });
});
