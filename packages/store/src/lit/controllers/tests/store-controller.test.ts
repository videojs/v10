import { describe, expect, it } from 'vitest';

import { createCoreTestStore, createMockHost } from '../../tests/test-utils';
import { StoreController } from '../store-controller';

describe('StoreController', () => {
  it('returns state and request', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new StoreController(host, store);

    expect(controller.value.state).toEqual({ volume: 1, muted: false });
    expect(controller.value.request).toBeDefined();
    expect(typeof controller.value.request.setVolume).toBe('function');
  });

  it('registers with host', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new StoreController(host, store);

    expect(host.controllers.has(controller)).toBe(true);
  });

  it('updates when state changes', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new StoreController(host, store);
    controller.hostConnected();

    expect(controller.value.state.volume).toBe(1);

    await store.request.setVolume!(0.5);

    expect(controller.value.state.volume).toBe(0.5);
    expect(host.updateCount).toBeGreaterThan(0);
  });

  it('unsubscribes on hostDisconnected', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new StoreController(host, store);
    controller.hostConnected();
    controller.hostDisconnected();

    const updateCountBefore = host.updateCount;
    await store.request.setVolume!(0.5);

    expect(host.updateCount).toBe(updateCountBefore);
  });

  it('syncs to current state on reconnect', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new StoreController(host, store);
    controller.hostConnected();

    await store.request.setVolume!(0.5);
    expect(controller.value.state.volume).toBe(0.5);

    controller.hostDisconnected();

    // Change state while disconnected
    await store.request.setVolume!(0.8);

    // Reconnect - should sync to current state
    controller.hostConnected();

    expect(controller.value.state.volume).toBe(0.8);
  });
});
