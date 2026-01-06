import { describe, expect, it } from 'vitest';

import { createCoreTestStore, createMockHost } from '../../tests/test-utils';
import { OptimisticController } from '../optimistic-controller';

describe('OptimisticController', () => {
  it('returns actual value initially', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);

    expect(controller.value.value).toBe(1);
    expect(controller.value.status).toBe('idle');
  });

  it('registers with host', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);

    expect(host.controllers.has(controller)).toBe(true);
  });

  it('provides setValue function', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);

    expect(typeof controller.value.setValue).toBe('function');
  });

  it('updates actual value after mutation completes', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);
    controller.hostConnected();

    await controller.value.setValue(0.3);

    expect(controller.value.value).toBe(0.3);
    expect(controller.value.status).toBe('success');
  });

  it('reset clears error state', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);
    controller.hostConnected();

    await controller.value.setValue(0.5);

    controller.value.reset();

    expect(controller.value.status).toBe('idle');
  });

  it('triggers host update when state changes', async () => {
    const { store, target } = createCoreTestStore();
    const host = createMockHost();

    const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);
    controller.hostConnected();

    target.volume = 0.8;
    target.dispatchEvent(new Event('volumechange'));

    expect(host.updateCount).toBeGreaterThan(0);
    expect(controller.value.value).toBe(0.8);
  });

  it('unsubscribes on hostDisconnected', async () => {
    const { store, target } = createCoreTestStore();
    const host = createMockHost();

    const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);
    controller.hostConnected();
    controller.hostDisconnected();

    const updateCountBefore = host.updateCount;
    target.volume = 0.2;
    target.dispatchEvent(new Event('volumechange'));

    expect(host.updateCount).toBe(updateCountBefore);
  });
});
