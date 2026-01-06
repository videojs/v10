import type { ReactiveControllerHost } from '@lit/reactive-element';
import type { AnySlice } from '../../core/slice';
import type { Store } from '../../core/store';

import { ReactiveElement } from '@lit/reactive-element';

import { noop } from '@videojs/utils/function';

import { afterEach } from 'vitest';
import { createSlice } from '../../core/slice';
import { createStore as createCoreStore } from '../../core/store';
import { createStore as createLitStore } from '../create-store';

/** Concrete base class for mixin tests (ReactiveElement is abstract). */
export class TestBaseElement extends ReactiveElement {}

export class MockMedia extends EventTarget {
  volume = 1;
  muted = false;
}

export const audioSlice = createSlice<MockMedia>()({
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
      await new Promise(resolve => setTimeout(resolve, 50));
      target.volume = volume;
      target.dispatchEvent(new Event('volumechange'));
      return volume;
    },
  },
});

/** Slice with custom keys (name !== key) for testing superseding behavior. */
export const customKeySlice = createSlice<MockMedia>()({
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
        await new Promise(resolve => setTimeout(resolve, 20));
        target.volume = volume;
        target.dispatchEvent(new Event('volumechange'));
        return volume;
      },
    },
    // name='toggleMute', key='audio-settings' (same key - will supersede adjustVolume)
    toggleMute: {
      key: 'audio-settings',
      handler: async (muted: boolean, { target }): Promise<boolean> => {
        await new Promise(resolve => setTimeout(resolve, 20));
        target.muted = muted;
        target.dispatchEvent(new Event('volumechange'));
        return muted;
      },
    },
  },
});

type TestSlice = typeof audioSlice;
type CustomKeySlice = typeof customKeySlice;

// For controller tests - creates core store with attached target
export function createCoreTestStore(): { store: Store<MockMedia, [TestSlice]>; target: MockMedia } {
  const store = createCoreStore({
    slices: [audioSlice] as [AnySlice],
    onError: noop,
  });

  const target = new MockMedia();
  store.attach(target);

  return { store, target };
}

/** Creates store with custom key slice (name !== key) for testing superseding. */
export function createCustomKeyTestStore(): { store: Store<MockMedia, [CustomKeySlice]>; target: MockMedia } {
  const store = createCoreStore({
    slices: [customKeySlice] as [AnySlice],
    onError: noop,
  });

  const target = new MockMedia();
  store.attach(target);

  return { store, target };
}

// For mixin tests - creates lit store factory
export function createLitTestStore() {
  return createLitStore({ slices: [audioSlice] });
}

// Mock ReactiveControllerHost for controller tests
export interface MockHost extends ReactiveControllerHost {
  controllers: Set<unknown>;
  updateCount: number;
}

export function createMockHost(): MockHost {
  const controllers = new Set<unknown>();
  const host: MockHost = {
    controllers,
    updateCount: 0,
    addController(controller: unknown): void {
      controllers.add(controller);
    },
    removeController(controller: unknown): void {
      controllers.delete(controller);
    },
    requestUpdate(): void {
      host.updateCount++;
    },
    updateComplete: Promise.resolve(true),
  };
  return host;
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
