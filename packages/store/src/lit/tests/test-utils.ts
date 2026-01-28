import { ReactiveElement } from '@lit/reactive-element';
import { noop } from '@videojs/utils/function';
import { afterEach } from 'vitest';
import type { AnyFeature } from '../../core/feature';
import { createFeature } from '../../core/feature';
import type { Store } from '../../core/store';
import { createStore as createCoreStore } from '../../core/store';
import { createStore as createLitStore } from '../create-store';

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

export const audioFeature = createFeature<MockMedia>()({
  initialState: { volume: 1, muted: false },
  getSnapshot: ({ target }) => ({
    volume: target.volume,
    muted: target.muted,
  }),
  subscribe: ({ target, update, signal }) => {
    const handler = () => update();
    target.addEventListener('volumechange', handler);
    signal.addEventListener('abort', () => {
      target.removeEventListener('volumechange', handler);
    });
  },
  request: {
    setVolume: (volume: number, { target }): number => {
      target.volume = volume;
      target.dispatchEvent(new Event('volumechange'));
      return volume;
    },
    setMuted: (muted: boolean, { target }): boolean => {
      target.muted = muted;
      target.dispatchEvent(new Event('volumechange'));
      return muted;
    },
    slowSetVolume: async (volume: number, { target }): Promise<number> => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      target.volume = volume;
      target.dispatchEvent(new Event('volumechange'));
      return volume;
    },
  },
});

/** Feature with custom keys (name !== key) for testing superseding behavior. */
export const customKeyFeature = createFeature<MockMedia>()({
  initialState: { volume: 1, muted: false },
  getSnapshot: ({ target }) => ({
    volume: target.volume,
    muted: target.muted,
  }),
  subscribe: ({ target, update, signal }) => {
    const handler = () => update();
    target.addEventListener('volumechange', handler);
    signal.addEventListener('abort', () => {
      target.removeEventListener('volumechange', handler);
    });
  },
  request: {
    // name='adjustVolume', key='audio-settings'
    adjustVolume: {
      key: 'audio-settings',
      handler: async (volume: number, { target }): Promise<number> => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        target.volume = volume;
        target.dispatchEvent(new Event('volumechange'));
        return volume;
      },
    },
    // name='toggleMute', key='audio-settings' (same key - will supersede adjustVolume)
    toggleMute: {
      key: 'audio-settings',
      handler: async (muted: boolean, { target }): Promise<boolean> => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        target.muted = muted;
        target.dispatchEvent(new Event('volumechange'));
        return muted;
      },
    },
  },
});

type TestFeature = typeof audioFeature;
type CustomKeyFeature = typeof customKeyFeature;

// For controller tests - creates core store with attached target
export function createCoreTestStore(): { store: Store<MockMedia, [TestFeature]>; target: MockMedia } {
  const store = createCoreStore({
    features: [audioFeature] as [AnyFeature],
    onError: noop,
  });

  const target = new MockMedia();
  store.attach(target);

  return { store, target };
}

/** Creates store with custom key feature (name !== key) for testing superseding. */
export function createCustomKeyTestStore(): { store: Store<MockMedia, [CustomKeyFeature]>; target: MockMedia } {
  const store = createCoreStore({
    features: [customKeyFeature] as [AnyFeature],
    onError: noop,
  });

  const target = new MockMedia();
  store.attach(target);

  return { store, target };
}

// For mixin tests - creates lit store factory
export function createLitTestStore() {
  return createLitStore({ features: [audioFeature] });
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
