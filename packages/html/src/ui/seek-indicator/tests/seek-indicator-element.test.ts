import { describe, expect, it } from 'vitest';
import { SeekIndicatorElement } from '../seek-indicator-element';
import { SeekIndicatorValueElement } from '../seek-indicator-value-element';

describe('SeekIndicatorElement', () => {
  it('exposes standalone tag names', () => {
    expect(SeekIndicatorElement.tagName).toBe('media-seek-indicator');
    expect(SeekIndicatorValueElement.tagName).toBe('media-seek-indicator-value');
  });
});
