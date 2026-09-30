import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { controlFrames, mountIndicator } from '../../input-indicator/tests/fixture';
import { SeekIndicatorElement } from '../../seek-indicator/element';
import { StatusIndicatorElement } from '../element';
import { StatusIndicatorValueElement } from '../value';

customElements.define(StatusIndicatorElement.tagName, StatusIndicatorElement);
customElements.define(SeekIndicatorElement.tagName, SeekIndicatorElement);

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('StatusIndicatorElement', () => {
  it('exposes standalone tag names', () => {
    expect(StatusIndicatorElement.tagName).toBe('media-status-indicator');
    expect(StatusIndicatorValueElement.tagName).toBe('media-status-indicator-value');
  });

  it('keeps repeated updates in the current transition', async () => {
    const frame = controlFrames();
    const status = await mountIndicator(new StatusIndicatorElement(), '<media-status-indicator-value />');
    const seek = await mountIndicator(new SeekIndicatorElement(), '<media-seek-indicator-value />');

    try {
      await status.input('k', 'togglePaused');
      await seek.input('l', 'seekStep', 10);
      expect(status.element.textContent).toBe('Playing');
      expect(status.element.hasAttribute('data-starting-style')).toBe(true);
      expect(seek.element.hasAttribute('data-starting-style')).toBe(true);

      await frame();
      await frame();
      await status.element.updateComplete;
      await seek.element.updateComplete;
      expect(status.element.hasAttribute('data-starting-style')).toBe(false);
      expect(seek.element.hasAttribute('data-starting-style')).toBe(false);

      await status.input('m', 'volumeStep', 0.1);
      await seek.input('j', 'seekStep', 10);
      expect(status.element.textContent).toBe('60%');
      expect(status.element.hasAttribute('data-open')).toBe(true);
      expect(status.element.hasAttribute('data-starting-style')).toBe(false);
      expect(seek.element.textContent).toBe('20s');
      expect(seek.element.hasAttribute('data-starting-style')).toBe(true);
    } finally {
      status.dispose();
      seek.dispose();
    }
  });
});
