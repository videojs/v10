import type { ReactiveControllerHost } from '@lit/reactive-element';
import type { AnySlice } from '../../../core/slice';
import type { Store } from '../../../core/store';

import { createSlice } from '../../../core/slice';
import { createStore as createCoreStore } from '../../../core/store';

export class MockMedia extends EventTarget {
  volume = 1;
  muted = false;
}

const audioSlice = createSlice<MockMedia>()({
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

export function createTestStore(): { store: Store<MockMedia, [TestSlice]>; target: MockMedia } {
  const store = createCoreStore({ slices: [audioSlice] as [AnySlice] }) as Store<MockMedia, [TestSlice]>;
  const target = new MockMedia();
  store.attach(target);
  return { store, target };
}

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
