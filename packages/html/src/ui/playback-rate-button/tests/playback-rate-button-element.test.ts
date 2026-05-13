import type { PlaybackRateButtonCore } from '@videojs/core';
import { describe, expect, it, vi } from 'vitest';
import { PlaybackRateButtonElement } from '../playback-rate-button-element';

let tagCounter = 0;

function createPlaybackRateButton(): PlaybackRateButtonElement {
  const tag = `test-playback-rate-button-${tagCounter++}`;
  customElements.define(tag, class extends PlaybackRateButtonElement {});
  return document.createElement(tag) as PlaybackRateButtonElement;
}

describe('PlaybackRateButtonElement', () => {
  it('exposes the core-derived label', () => {
    const button = createPlaybackRateButton();
    const core = (button as unknown as { readonly core: PlaybackRateButtonCore }).core;

    core.setMedia({
      playbackRates: [0.5, 1, 1.5],
      playbackRate: 1.5,
      setPlaybackRate: vi.fn(),
    });
    core.getState();

    expect(button.getLabel()).toBe('Playback speed');
  });
});
