import { noop } from '@videojs/utils/function';

import { describe, expect, it } from 'vitest';

import { createSlice } from '../../../core/slice';
import { flush } from '../../../core/state';
import { createStore as createCoreStore } from '../../../core/store';
import { createCoreTestStore, createCustomKeyTestStore, createMockHost, MockMedia } from '../../tests/test-utils';
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
    flush();
    expect(controller.value.status).toBe('success');

    controller.value.reset();
    flush();

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

    const failingStore = createCoreStore({
      slices: [failingSlice],
      onError: noop,
    });

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

  it('tracks pending status while mutation is in flight', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new MutationController(host, store, 'slowSetVolume');
    controller.hostConnected();

    const promise = controller.value.mutate(0.5);

    // Wait for task to start
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(controller.value.status).toBe('pending');

    await promise;

    expect(controller.value.status).toBe('success');
  });

  it('syncs state on reconnect after disconnect', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new MutationController(host, store, 'setVolume');
    controller.hostConnected();

    await controller.value.mutate(0.5);
    expect(controller.value.status).toBe('success');

    controller.hostDisconnected();

    // Trigger another mutation while disconnected
    await store.request.setVolume!(0.8);

    // Reconnect - should sync to current task state
    controller.hostConnected();

    expect(controller.value.status).toBe('success');
  });

  describe('custom key (name !== key)', () => {
    it('tracks task by name when key differs', async () => {
      const { store } = createCustomKeyTestStore();
      const host = createMockHost();

      // adjustVolume has name='adjustVolume' but key='audio-settings'
      const controller = new MutationController(host, store, 'adjustVolume');
      controller.hostConnected();

      const promise = controller.value.mutate(0.5);

      // Wait for task to start
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(controller.value.status).toBe('pending');

      await promise;

      expect(controller.value.status).toBe('success');
      if (controller.value.status === 'success') {
        expect(controller.value.data).toBe(0.5);
      }
    });

    it('tracks correct task when multiple requests share same key', async () => {
      const { store } = createCustomKeyTestStore();
      const hostVolume = createMockHost();
      const hostMute = createMockHost();

      // Both adjustVolume and toggleMute have key='audio-settings'
      const volumeController = new MutationController(hostVolume, store, 'adjustVolume');
      const muteController = new MutationController(hostMute, store, 'toggleMute');
      volumeController.hostConnected();
      muteController.hostConnected();

      // Start volume adjustment
      const volumePromise = volumeController.value.mutate(0.5);

      await new Promise(resolve => setTimeout(resolve, 5));

      // Volume controller should be pending
      expect(volumeController.value.status).toBe('pending');
      // Mute controller should be idle (different name, even though same key)
      expect(muteController.value.status).toBe('idle');

      await volumePromise;

      expect(volumeController.value.status).toBe('success');
      expect(muteController.value.status).toBe('idle');
    });

    it('superseded task shows error status', async () => {
      const { store } = createCustomKeyTestStore();
      const hostVolume = createMockHost();
      const hostMute = createMockHost();

      const volumeController = new MutationController(hostVolume, store, 'adjustVolume');
      const muteController = new MutationController(hostMute, store, 'toggleMute');
      volumeController.hostConnected();
      muteController.hostConnected();

      // Start volume adjustment
      const volumePromise = volumeController.value.mutate(0.5);

      await new Promise(resolve => setTimeout(resolve, 5));

      // Start mute toggle - this will supersede volume because same key
      const mutePromise = muteController.value.mutate(true);

      // Wait for superseding to happen
      await new Promise(resolve => setTimeout(resolve, 5));

      // Volume task was superseded
      try {
        await volumePromise;
      } catch {
        // Expected - task was superseded
      }

      // Tasks are keyed by name, so superseded task shows error status
      expect(volumeController.value.status).toBe('error');
      expect(muteController.value.status).toBe('pending');

      await mutePromise;

      expect(muteController.value.status).toBe('success');
    });
  });
});
