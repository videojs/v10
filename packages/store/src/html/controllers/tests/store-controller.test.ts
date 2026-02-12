import { afterEach, describe, expect, it } from 'vitest';

import { createCoreTestStore, createTestHost } from '../../tests/test-utils';
import { StoreController } from '../store-controller';

describe('StoreController', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns store without selector (no subscription)', () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new StoreController(host, store);
    const value = controller.value;

    expect(value).toBe(store);
    expect(value.volume).toBe(1);
    expect(typeof value.setVolume).toBe('function');
  });

  it('does not trigger updates without selector', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    new StoreController(host, store);
    document.body.appendChild(host);

    // Wait for initial update cycle to complete
    await Promise.resolve();
    const initialCount = host.updateCount;

    await store.setVolume(0.5);

    expect(host.updateCount).toBe(initialCount);
  });

  it('returns selected state with selector', () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new StoreController(host, store, (s) => s.volume);

    document.body.appendChild(host);

    expect(controller.value).toBe(1);
  });

  it('updates when selected state changes', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new StoreController(host, store, (s) => s.volume);
    document.body.appendChild(host);

    expect(controller.value).toBe(1);

    await store.setVolume(0.5);

    expect(controller.value).toBe(0.5);
    expect(host.updateCount).toBeGreaterThan(0);
  });

  it('unsubscribes on disconnect', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    new StoreController(host, store, (s) => s.volume);
    document.body.appendChild(host);
    host.remove();

    const updateCountBefore = host.updateCount;
    await store.setVolume(0.5);

    expect(host.updateCount).toBe(updateCountBefore);
  });

  it('syncs to current state on reconnect', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new StoreController(host, store, (s) => s.volume);
    document.body.appendChild(host);

    await store.setVolume(0.5);
    expect(controller.value).toBe(0.5);

    host.remove();

    await store.setVolume(0.8);

    // Reconnect
    document.body.appendChild(host);

    expect(controller.value).toBe(0.8);
  });
});
