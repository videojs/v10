import type { ReactiveControllerHost } from '@lit/reactive-element';
import type { AnySlice } from '../../core/slice';
import type { Store } from '../../core/store';

import { afterEach } from 'vitest';

import { createSlice } from '../../core/slice';
import { createStore as createCoreStore } from '../../core/store';
import { createStore as createLitStore } from '../create-store';

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
  },
});

type TestSlice = typeof audioSlice;

// For controller tests - creates core store with attached target
export function createCoreTestStore(): { store: Store<MockMedia, [TestSlice]>; target: MockMedia } {
  const store = createCoreStore({ slices: [audioSlice] as [AnySlice] }) as Store<MockMedia, [TestSlice]>;
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
