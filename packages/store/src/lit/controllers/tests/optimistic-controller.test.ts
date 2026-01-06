import { noop } from '@videojs/utils/function';

import { describe, expect, it } from 'vitest';
import { createSlice } from '../../../core/slice';
import { createStore as createCoreStore } from '../../../core/store';
import { createCoreTestStore, createCustomKeyTestStore, createMockHost, MockMedia } from '../../tests/test-utils';
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

  it('shows optimistic value immediately while pending', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new OptimisticController(host, store, 'slowSetVolume', s => s.volume);
    controller.hostConnected();

    const promise = controller.value.setValue(0.3);

    // Optimistic value shown immediately
    expect(controller.value.value).toBe(0.3);
    expect(host.updateCount).toBeGreaterThan(0);

    // Wait for task to start
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(controller.value.status).toBe('pending');
    expect(controller.value.value).toBe(0.3);

    await promise;

    // After completion, shows actual value
    expect(controller.value.status).toBe('success');
    expect(controller.value.value).toBe(0.3);
  });

  it('reverts to actual value on error', async () => {
    const host = createMockHost();

    const failingSlice = createSlice<MockMedia>()({
      initialState: { volume: 1, muted: false },
      getSnapshot: ({ target }) => ({
        volume: target.volume,
        muted: target.muted,
      }),
      subscribe: () => {},
      request: {
        failingSetVolume: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
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

    const controller = new OptimisticController(host, failingStore, 'failingSetVolume', s => s.volume);
    controller.hostConnected();

    const promise = controller.value.setValue(0.5);

    // Optimistic value shown immediately
    expect(controller.value.value).toBe(0.5);

    try {
      await promise;
    } catch {
      // Expected
    }

    // After error, shows actual value (reverted)
    expect(controller.value.status).toBe('error');
    expect(controller.value.value).toBe(1); // Original value
    if (controller.value.status === 'error') {
      expect(controller.value.error).toBeInstanceOf(Error);
    }
  });

  it('handles rapid setValue calls (superseding)', async () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new OptimisticController(host, store, 'slowSetVolume', s => s.volume);
    controller.hostConnected();

    // Fire multiple rapid calls
    const promise1 = controller.value.setValue(0.3);
    const promise2 = controller.value.setValue(0.5);
    const promise3 = controller.value.setValue(0.7);

    // Should show latest optimistic value
    expect(controller.value.value).toBe(0.7);

    // First two get superseded
    await expect(promise1).rejects.toMatchObject({ code: 'SUPERSEDED' });
    await expect(promise2).rejects.toMatchObject({ code: 'SUPERSEDED' });
    await promise3;

    expect(controller.value.status).toBe('success');
    expect(controller.value.value).toBe(0.7);
  });

  it('reset when already idle is safe', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);
    controller.hostConnected();

    expect(controller.value.status).toBe('idle');

    // Reset when idle should not throw
    controller.value.reset();

    expect(controller.value.status).toBe('idle');
    expect(controller.value.value).toBe(1);
  });

  describe('custom key (name !== key)', () => {
    it('tracks task by name when key differs', async () => {
      const { store } = createCustomKeyTestStore();
      const host = createMockHost();

      // adjustVolume has name='adjustVolume' but key='audio-settings'
      const controller = new OptimisticController(host, store, 'adjustVolume', s => s.volume);
      controller.hostConnected();

      const promise = controller.value.setValue(0.5);

      // Optimistic value shown immediately
      expect(controller.value.value).toBe(0.5);

      // Wait for task to start
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(controller.value.status).toBe('pending');

      await promise;

      expect(controller.value.status).toBe('success');
      expect(controller.value.value).toBe(0.5);
    });

    it('tracks correct task when multiple requests share same key', async () => {
      const { store } = createCustomKeyTestStore();
      const hostVolume = createMockHost();
      const hostMute = createMockHost();

      // Both adjustVolume and toggleMute have key='audio-settings'
      const volumeController = new OptimisticController(hostVolume, store, 'adjustVolume', s => s.volume);
      const muteController = new OptimisticController(hostMute, store, 'toggleMute', s => s.muted);
      volumeController.hostConnected();
      muteController.hostConnected();

      // Start volume adjustment
      const volumePromise = volumeController.value.setValue(0.5);

      await new Promise(resolve => setTimeout(resolve, 5));

      // Volume controller should be pending
      expect(volumeController.value.status).toBe('pending');
      expect(volumeController.value.value).toBe(0.5); // Optimistic

      // Mute controller should be idle (different name, even though same key)
      expect(muteController.value.status).toBe('idle');
      expect(muteController.value.value).toBe(false); // Actual

      await volumePromise;

      expect(volumeController.value.status).toBe('success');
      expect(muteController.value.status).toBe('idle');
    });

    it('superseded task shows error status', async () => {
      const { store } = createCustomKeyTestStore();
      const hostVolume = createMockHost();
      const hostMute = createMockHost();

      const volumeController = new OptimisticController(hostVolume, store, 'adjustVolume', s => s.volume);
      const muteController = new OptimisticController(hostMute, store, 'toggleMute', s => s.muted);
      volumeController.hostConnected();
      muteController.hostConnected();

      // Start volume adjustment
      const volumePromise = volumeController.value.setValue(0.5);

      await new Promise(resolve => setTimeout(resolve, 5));

      // Start mute toggle - this will supersede volume because same key
      const mutePromise = muteController.value.setValue(true);

      // Mute shows optimistic immediately
      expect(muteController.value.value).toBe(true);

      // Volume task was superseded
      try {
        await volumePromise;
      } catch {
        // Expected - task was superseded
      }

      // Wait for subscription callbacks to fire
      await new Promise(resolve => setTimeout(resolve, 10));

      // Tasks are keyed by name, so superseded task shows error status
      expect(volumeController.value.status).toBe('error');

      // Complete the mute operation
      await mutePromise;

      expect(muteController.value.status).toBe('success');
    });
  });
});
