import { describe, expect, it } from 'vitest';

import { createSlice } from '../../../core/slice';
import { createStore as createCoreStore } from '../../../core/store';
import { createCoreTestStore, createMockHost, MockMedia } from '../../tests/test-utils';
import { MutationController } from '../mutation-controller';

describe('MutationController', () => {
  it('returns mutation result with idle status initially', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new MutationController(host, store, 'setVolume');

    expect(controller.value.status).toBe('idle');
  });

  it('registers with host', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new MutationController(host, store, 'setVolume');

    expect(host.controllers.has(controller)).toBe(true);
  });

  it('provides mutate function', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new MutationController(host, store, 'setVolume');

    expect(typeof controller.value.mutate).toBe('function');
  });

  it('tracks success state with data', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new MutationController(host, store, 'setVolume');
    controller.hostConnected();

    await controller.value.mutate(0.7);

    expect(controller.value.status).toBe('success');
    if (controller.value.status === 'success') {
      expect(controller.value.data).toBe(0.7);
    }
    expect(host.updateCount).toBeGreaterThan(0);
  });

  it('reset clears settled state', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new MutationController(host, store, 'setVolume');
    controller.hostConnected();

    await controller.value.mutate(0.5);
    expect(controller.value.status).toBe('success');

    controller.value.reset();

    expect(controller.value.status).toBe('idle');
  });

  it('unsubscribes on hostDisconnected', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new MutationController(host, store, 'setVolume');
    controller.hostConnected();
    controller.hostDisconnected();

    const updateCountBefore = host.updateCount;
    await store.request.setVolume!(0.5);

    expect(host.updateCount).toBe(updateCountBefore);
  });

  it('tracks error with error object', async () => {
    const host = createMockHost();

    // Create a slice with a failing request for testing
    const failingSlice = createSlice<MockMedia>()({
      initialState: { volume: 1, muted: false },
      getSnapshot: ({ target }) => ({
        volume: target.volume,
        muted: target.muted,
      }),
      subscribe: () => {},
      request: {
        failingRequest: async () => {
          throw new Error('Test error');
        },
      },
    });

    const failingStore = createCoreStore({ slices: [failingSlice] });
    const target = new MockMedia();
    failingStore.attach(target);

    const controller = new MutationController(host, failingStore, 'failingRequest');
    controller.hostConnected();

    try {
      await controller.value.mutate();
    } catch {
      // Expected to throw
    }

    expect(controller.value.status).toBe('error');
    if (controller.value.status === 'error') {
      expect(controller.value.error).toBeInstanceOf(Error);
      expect((controller.value.error as Error).message).toBe('Test error');
    }
  });
});
