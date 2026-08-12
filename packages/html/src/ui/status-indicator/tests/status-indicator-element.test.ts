import { describe, expect, it } from 'vitest';
import { StatusIndicatorElement } from '../status-indicator-element';
import { StatusIndicatorValueElement } from '../status-indicator-value-element';

describe('StatusIndicatorElement', () => {
  it('exposes standalone tag names', () => {
    expect(StatusIndicatorElement.tagName).toBe('media-status-indicator');
    expect(StatusIndicatorValueElement.tagName).toBe('media-status-indicator-value');
  });
});
