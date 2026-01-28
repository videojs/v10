import { afterEach, describe, expect, it } from 'vitest';

import { createCoreTestStore, createTestHost } from '../../tests/test-utils';
import { QueueController } from '../queue-controller';

describe('QueueController', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns tasks record', () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new QueueController(host, store);

    expect(controller.value).toEqual({});
  });

  it('updates when task completes', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new QueueController(host, store);
    document.body.appendChild(host);

    expect(controller.value.setVolume).toBeUndefined();

    await store.request.setVolume!(0.5);

    expect(controller.value.setVolume).toBeDefined();
    expect(controller.value.setVolume?.status).toBe('success');
    expect(host.updateCount).toBeGreaterThan(0);
  });

  it('unsubscribes on disconnect', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new QueueController(host, store);
    document.body.appendChild(host);
    host.remove();

    const updateCountBefore = host.updateCount;
    await store.request.setVolume!(0.5);

    expect(host.updateCount).toBe(updateCountBefore);
  });

  it('handles multiple task updates', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new QueueController(host, store);
    document.body.appendChild(host);

    await store.request.setVolume!(0.5);
    await store.request.setMuted!(true);

    expect(controller.value.setVolume).toBeDefined();
    expect(controller.value.setMuted).toBeDefined();
    expect(controller.value.setVolume?.status).toBe('success');
    expect(controller.value.setMuted?.status).toBe('success');
  });

  it('syncs to current tasks on reconnect', async () => {
    const { store } = createCoreTestStore();
    const host = createTestHost();

    const controller = new QueueController(host, store);
    document.body.appendChild(host);

    await store.request.setVolume!(0.5);
    expect(controller.value.setVolume?.status).toBe('success');

    host.remove();

    await store.request.setMuted!(true);

    // Reconnect
    document.body.appendChild(host);

    expect(controller.value.setVolume?.status).toBe('success');
    expect(controller.value.setMuted?.status).toBe('success');
  });
});
