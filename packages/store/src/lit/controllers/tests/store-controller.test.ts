import { afterEach, describe, expect, it } from 'vitest';

import { createCoreTestStore, createTestHost } from '../../tests/test-utils';
import { StoreController } from '../store-controller';

interface AudioState {
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => Promise<number>;
  setMuted: (muted: boolean) => Promise<boolean>;
  slowSetVolume: (volume: number) => Promise<number>;
}

describe('StoreController', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns state and action functions spread together', () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new StoreController(host, store);
    const value = controller.value as AudioState;

    expect(value.volume).toBe(1);
    expect(value.muted).toBe(false);
    expect(typeof value.setVolume).toBe('function');
  });

  it('updates when state changes', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new StoreController(host, store);
    document.body.appendChild(host);

    expect((controller.value as AudioState).volume).toBe(1);

    await store.setVolume(0.5);

    expect((controller.value as AudioState).volume).toBe(0.5);
    expect(host.updateCount).toBeGreaterThan(0);
  });

  it('unsubscribes on disconnect', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    new StoreController(host, store);
    document.body.appendChild(host);
    host.remove();

    const updateCountBefore = host.updateCount;
    await store.setVolume(0.5);

    expect(host.updateCount).toBe(updateCountBefore);
  });

  it('syncs to current state on reconnect', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new StoreController(host, store);
    document.body.appendChild(host);

    await store.setVolume(0.5);
    expect((controller.value as AudioState).volume).toBe(0.5);

    host.remove();

    await store.setVolume(0.8);

    // Reconnect
    document.body.appendChild(host);

    expect((controller.value as AudioState).volume).toBe(0.8);
  });
});
