import { ReactiveElement } from '@lit/reactive-element';
import { noop } from '@videojs/utils/function';
import { afterEach } from 'vitest';
import { defineSlice } from '../../core/slice';
import type { Store } from '../../core/store';
import { createStore as createCoreStore } from '../../core/store';

/** Concrete base class for mixin tests (ReactiveElement is abstract). */
export class TestBaseElement extends ReactiveElement {}

/**
 * Test host element that extends ReactiveElement.
 * Tracks update calls for assertions.
 */
export class TestHostElement extends ReactiveElement {
  updateCount = 0;

  requestUpdate(): void {
    this.updateCount++;
    super.requestUpdate();
  }
}

export class MockMedia extends EventTarget {
  volume = 1;
  muted = false;
}

export const audioSlice = defineSlice<MockMedia>()({
  state: ({ target }) => ({
    volume: 1,
    muted: false,
    setVolume(volume: number) {
      target().volume = volume;
      target().dispatchEvent(new Event('volumechange'));
      return volume;
    },
    setMuted(muted: boolean) {
      target().muted = muted;
      target().dispatchEvent(new Event('volumechange'));
      return muted;
    },
    async slowSetVolume(volume: number) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      target().volume = volume;
      target().dispatchEvent(new Event('volumechange'));
      return volume;
    },
  }),

  attach({ target, signal, set }) {
    const sync = () => set({ volume: target.volume, muted: target.muted });

    sync();

    target.addEventListener('volumechange', sync);
    signal.addEventListener('abort', () => {
      target.removeEventListener('volumechange', sync);
    });
  },
});

export type AudioSliceState = {
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => number;
  setMuted: (muted: boolean) => boolean;
  slowSetVolume: (volume: number) => Promise<number>;
};

type TestStore = Store<MockMedia, AudioSliceState>;

// For controller tests - creates core store with attached target
export function createCoreTestStore(): { store: TestStore; target: MockMedia } {
  const store = createCoreStore<MockMedia>()(audioSlice, { onError: noop });

  const target = new MockMedia();
  store.attach(target);

  return { store, target };
}

/** Type alias for test host. */
export type TestHost = TestHostElement;

let testHostCounter = 0;

/** Creates a test host element for controller tests. */
export function createTestHost(): TestHost {
  const tagName = `test-host-${testHostCounter++}`;
  if (!customElements.get(tagName)) {
    customElements.define(tagName, class extends TestHostElement {});
  }
  return document.createElement(tagName) as TestHost;
}

// For mixin tests - unique custom element tags
let tagCounter = 0;

export function uniqueTag(base: string): string {
  return `${base}-${Date.now()}-${tagCounter++}`;
}

export function setupDomCleanup(): void {
  afterEach(() => {
    document.body.innerHTML = '';
  });
}
