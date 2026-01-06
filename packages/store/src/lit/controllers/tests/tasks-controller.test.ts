import { describe, expect, it } from 'vitest';

import { createCoreTestStore, createMockHost } from '../../tests/test-utils';
import { TasksController } from '../tasks-controller';

describe('TasksController', () => {
  it('returns tasks record', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new TasksController(host, store);

    expect(controller.value).toEqual({});
  });

  it('registers with host', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new TasksController(host, store);

    expect(host.controllers.has(controller)).toBe(true);
  });

  it('updates when task completes', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new TasksController(host, store);
    controller.hostConnected();

    expect(controller.value.setVolume).toBeUndefined();

    await store.request.setVolume!(0.5);

    expect(controller.value.setVolume).toBeDefined();
    expect(controller.value.setVolume?.status).toBe('success');
    expect(host.updateCount).toBeGreaterThan(0);
  });

  it('unsubscribes on hostDisconnected', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new TasksController(host, store);
    controller.hostConnected();
    controller.hostDisconnected();

    const updateCountBefore = host.updateCount;
    await store.request.setVolume!(0.5);

    expect(host.updateCount).toBe(updateCountBefore);
  });

  it('handles multiple task updates', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new TasksController(host, store);
    controller.hostConnected();

    // Fire multiple requests
    await store.request.setVolume!(0.5);
    await store.request.setMuted!(true);

    // Both tasks should be tracked
    expect(controller.value.setVolume).toBeDefined();
    expect(controller.value.setMuted).toBeDefined();
    expect(controller.value.setVolume?.status).toBe('success');
    expect(controller.value.setMuted?.status).toBe('success');
  });

  it('syncs to current tasks on reconnect', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new TasksController(host, store);
    controller.hostConnected();

    await store.request.setVolume!(0.5);
    expect(controller.value.setVolume?.status).toBe('success');

    controller.hostDisconnected();

    // Trigger another task while disconnected
    await store.request.setMuted!(true);

    // Reconnect - should sync to current tasks
    controller.hostConnected();

    expect(controller.value.setVolume?.status).toBe('success');
    expect(controller.value.setMuted?.status).toBe('success');
  });
});
