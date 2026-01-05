import type { ReactiveControllerHost } from '@lit/reactive-element';

import { describe, expect, it } from 'vitest';

import { createSlice } from '../../core/slice';
import { createStore as createCoreStore } from '../../core/store';
import { RequestController, SelectorController, TasksController } from '../controllers';

describe('lit controllers', () => {
  // Mock target
  class MockMedia extends EventTarget {
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
      setVolume: (volume: number, { target }) => {
        target.volume = volume;
        target.dispatchEvent(new Event('volumechange'));
        return volume;
      },
      setMuted: (muted: boolean, { target }) => {
        target.muted = muted;
        target.dispatchEvent(new Event('volumechange'));
        return muted;
      },
    },
  });

  function createTestStore() {
    const store = createCoreStore({ slices: [audioSlice] });
    const target = new MockMedia();
    store.attach(target);
    return { store, target };
  }

  function createMockHost(): ReactiveControllerHost & { controllers: Set<unknown>; updateCount: number } {
    const controllers = new Set<unknown>();
    const host = {
      controllers,
      updateCount: 0,
      addController(controller: unknown) {
        controllers.add(controller);
      },
      removeController(controller: unknown) {
        controllers.delete(controller);
      },
      requestUpdate() {
        host.updateCount++;
      },
      updateComplete: Promise.resolve(true),
    };
    return host;
  }

  describe('selectorController', () => {
    it('returns selected state', () => {
      const { store } = createTestStore();
      const host = createMockHost();

      const controller = new SelectorController(host, store, s => s.volume);

      expect(controller.value).toBe(1);
    });

    it('registers with host', () => {
      const { store } = createTestStore();
      const host = createMockHost();

      const controller = new SelectorController(host, store, s => s.volume);

      expect(host.controllers.has(controller)).toBe(true);
    });

    it('subscribes on hostConnected', () => {
      const { store, target } = createTestStore();
      const host = createMockHost();

      const controller = new SelectorController(host, store, s => s.volume);
      controller.hostConnected();

      // Change volume
      target.volume = 0.5;
      target.dispatchEvent(new Event('volumechange'));

      expect(controller.value).toBe(0.5);
      expect(host.updateCount).toBe(1);
    });

    it('unsubscribes on hostDisconnected', () => {
      const { store, target } = createTestStore();
      const host = createMockHost();

      const controller = new SelectorController(host, store, s => s.volume);
      controller.hostConnected();

      // Disconnect
      controller.hostDisconnected();

      // Change volume should not trigger update
      const updateCountBefore = host.updateCount;
      target.volume = 0.3;
      target.dispatchEvent(new Event('volumechange'));

      expect(host.updateCount).toBe(updateCountBefore);
    });

    it('syncs value on reconnect after state changed while disconnected', () => {
      const { store, target } = createTestStore();
      const host = createMockHost();

      const controller = new SelectorController(host, store, s => s.volume);
      controller.hostConnected();

      expect(controller.value).toBe(1);

      // Disconnect
      controller.hostDisconnected();

      // Change state while disconnected
      target.volume = 0.3;
      target.dispatchEvent(new Event('volumechange'));

      // Value should still be stale (not subscribed)
      expect(controller.value).toBe(1);

      // Reconnect - should have current value
      controller.hostConnected();

      expect(controller.value).toBe(0.3);
    });

    it('does not trigger update when unrelated state changes', () => {
      const { store, target } = createTestStore();
      const host = createMockHost();

      const controller = new SelectorController(host, store, s => s.volume);
      controller.hostConnected();

      // Change muted instead of volume
      target.muted = true;
      target.dispatchEvent(new Event('volumechange'));

      // Volume didn't change, so no update should be triggered
      expect(host.updateCount).toBe(0);
    });
  });

  describe('requestController', () => {
    it('returns request map', () => {
      const { store } = createTestStore();
      const host = createMockHost();

      const controller = new RequestController(host, store);

      expect(controller.value).toHaveProperty('setVolume');
      expect(controller.value).toHaveProperty('setMuted');
      expect(typeof controller.value.setVolume).toBe('function');
    });

    it('returns selected request', () => {
      const { store } = createTestStore();
      const host = createMockHost();

      const controller = new RequestController(host, store, r => r.setVolume);

      expect(typeof controller.value).toBe('function');
    });

    it('registers with host', () => {
      const { store } = createTestStore();
      const host = createMockHost();

      const controller = new RequestController(host, store);

      expect(host.controllers.has(controller)).toBe(true);
    });

    it('returns stable reference', () => {
      const { store } = createTestStore();
      const host = createMockHost();

      const controller = new RequestController(host, store);
      const first = controller.value;
      const second = controller.value;

      expect(first).toBe(second);
    });

    it('requests work correctly', async () => {
      const { store, target } = createTestStore();
      const host = createMockHost();

      const controller = new RequestController(host, store, r => r.setVolume);
      await controller.value(0.7);

      expect(target.volume).toBe(0.7);
    });
  });

  describe('tasksController', () => {
    it('returns tasks record', () => {
      const { store } = createTestStore();
      const host = createMockHost();

      const controller = new TasksController(host, store);

      expect(controller.value).toEqual({});
    });

    it('registers with host', () => {
      const { store } = createTestStore();
      const host = createMockHost();

      const controller = new TasksController(host, store);

      expect(host.controllers.has(controller)).toBe(true);
    });

    it('updates when task completes', async () => {
      const { store } = createTestStore();
      const host = createMockHost();

      const controller = new TasksController(host, store);
      controller.hostConnected();

      expect(controller.value.setVolume).toBeUndefined();

      await store.request.setVolume(0.5);

      expect(controller.value.setVolume).toBeDefined();
      expect(controller.value.setVolume?.status).toBe('success');
      expect(host.updateCount).toBeGreaterThan(0);
    });

    it('unsubscribes on hostDisconnected', async () => {
      const { store } = createTestStore();
      const host = createMockHost();

      const controller = new TasksController(host, store);
      controller.hostConnected();
      controller.hostDisconnected();

      const updateCountBefore = host.updateCount;
      await store.request.setVolume(0.5);

      // Should not have received update
      expect(host.updateCount).toBe(updateCountBefore);
    });
  });
});
