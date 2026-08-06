import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { SliderChapterElement } from '../slider-chapter-element';
import { SliderElement } from '../slider-element';

let tagCounter = 0;

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = `test-slider-chapter-${tagCounter++}`;
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
    name: 'slider-chapter',
    state: () => ({
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

describe('SliderChapterElement', () => {
  it('renders the chapter at the slider pointer position', async () => {
    const provider = createElement(TestPlayerProviderElement);
    const slider = createElement(SliderElement);
    const chapter = createElement(SliderChapterElement);
    provider.setStore(createPlayerStore());

    slider.append(chapter);
    provider.append(slider);
    document.body.append(provider);
    await waitForUpdates(provider, slider, chapter);

    expect(chapter.textContent).toBe('Introduction');
  });
});
