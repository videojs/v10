import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { TimeSliderElement } from '../time-slider-element';
import { TimeSliderSegmentsElement } from '../time-slider-segments-element';

let tagCounter = 0;

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = `test-time-slider-segments-${tagCounter++}`;
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

async function waitForUpdates(...elements: Array<{ updateComplete: Promise<boolean> }>): Promise<void> {
  for (const element of elements) await element.updateComplete;
  await Promise.resolve();
  for (const element of elements) await element.updateComplete;
}

function createPlayerStore(): AnyPlayerStore {
  return createStore<unknown>()({
    name: 'time-slider-segments',
    state: () => ({
      currentTime: 30,
      duration: 120,
      seeking: false,
      seek: vi.fn(),
      buffered: [[0, 60]] as [number, number][],
      seekable: [[0, 120]] as [number, number][],
      paused: false,
      ended: false,
      started: true,
      waiting: false,
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      chaptersCues: [
        { startTime: 0, endTime: 30, text: 'Introduction' },
        { startTime: 30, endTime: 120, text: 'Main' },
      ],
      thumbnailCues: [],
      thumbnailTrackSrc: null,
      textTrackList: [{ kind: 'chapters', label: 'Chapters', language: 'en', mode: 'hidden' as const }],
      subtitlesShowing: false,
      toggleSubtitles: vi.fn(),
      selectSubtitlesTrack: vi.fn(),
    }),
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends MediaElement {
  readonly #provider = new ContextProvider(this, { context: playerContext });

  setStore(store: AnyPlayerStore): void {
    this.#provider.setValue(store);
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('TimeSliderSegmentsElement', () => {
  it('renders chapter cues selected from the player store', async () => {
    const provider = createElement(TestPlayerProviderElement);
    const slider = createElement(TimeSliderElement);
    const segments = createElement(TimeSliderSegmentsElement);
    provider.setStore(createPlayerStore());

    slider.append(segments);
    provider.append(slider);
    document.body.append(provider);
    await waitForUpdates(provider, slider, segments);

    const rects = segments.querySelectorAll('rect');
    expect(rects).toHaveLength(2);
    expect(rects[0]?.style.getPropertyValue('--media-slider-segment-size')).toBe('25%');
    expect(rects[1]?.style.getPropertyValue('--media-slider-segment-offset')).toBe('25%');
    expect(rects[0]?.hasAttribute('data-highlighted')).toBe(false);
  });
});
