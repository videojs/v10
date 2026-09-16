import { describe, expect, it } from 'vite-plus/test';

import { StatusIndicatorElement } from '../element';
import { StatusIndicatorValueElement } from '../value';

class TestStatusIndicatorElement extends StatusIndicatorElement {
  get transitionOptions() {
    return this.options;
  }
}

customElements.define('test-status-indicator', TestStatusIndicatorElement);

describe('StatusIndicatorElement', () => {
  it('exposes standalone tag names', () => {
    expect(StatusIndicatorElement.tagName).toBe('media-status-indicator');
    expect(StatusIndicatorValueElement.tagName).toBe('media-status-indicator-value');
  });

  it('keeps repeated updates in the current transition', () => {
    const element = document.createElement('test-status-indicator') as TestStatusIndicatorElement;

    expect(element.transitionOptions).toEqual({ replayOnUpdate: false });
  });
});
