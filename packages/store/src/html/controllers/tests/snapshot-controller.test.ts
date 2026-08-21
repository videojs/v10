import { afterEach, describe, expect, it, vi } from 'vitest';

import { createState, flush } from '../../../core/state';
import { createTestHost } from '../../tests/test-utils';
import { SnapshotController } from '../snapshot-controller';

describe('SnapshotController', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('without selector', () => {
    it('returns full state', () => {
      const state = createState({ volume: 0.8, muted: false });
      const host = createTestHost();

      const controller = new SnapshotController(host, state);
      document.body.appendChild(host);

      expect(controller.value).toEqual({ volume: 0.8, muted: false });
    });

    it('triggers update on any state change', async () => {
      const state = createState({ volume: 1, muted: false });
      const host = createTestHost();

      new SnapshotController(host, state);
      document.body.appendChild(host);

      await Promise.resolve();
      const initialCount = host.updateCount;

      state.patch({ volume: 0.5 });
      flush();
      await Promise.resolve();

      expect(host.updateCount).toBeGreaterThan(initialCount);
    });
  });

  describe('with selector', () => {
    it('returns selected value', () => {
      const state = createState({ volume: 0.7, muted: true });
      const host = createTestHost();

      const controller = new SnapshotController(host, state, (s) => s.volume);
      document.body.appendChild(host);

      expect(controller.value).toBe(0.7);
    });

    it('triggers update when selected state changes', async () => {
      const state = createState({ volume: 1, muted: false });
      const host = createTestHost();

      const controller = new SnapshotController(host, state, (s) => s.volume);
      document.body.appendChild(host);

      expect(controller.value).toBe(1);

      state.patch({ volume: 0.5 });
      flush();
      await Promise.resolve();

      expect(controller.value).toBe(0.5);
      expect(host.updateCount).toBeGreaterThan(0);
    });

    it('does not trigger update when unrelated state changes', async () => {
      const state = createState({ volume: 1, muted: false });
      const host = createTestHost();

      new SnapshotController(host, state, (s) => s.volume);
      document.body.appendChild(host);

      await Promise.resolve();
      const initialCount = host.updateCount;

      state.patch({ muted: true });
      flush();
      await Promise.resolve();

      expect(host.updateCount).toBe(initialCount);
    });
  });

  describe('lifecycle', () => {
    it('unsubscribes on disconnect', async () => {
      const state = createState({ volume: 1, muted: false });
      const host = createTestHost();

      new SnapshotController(host, state, (s) => s.volume);
      document.body.appendChild(host);
      host.remove();

      const updateCountBefore = host.updateCount;

      state.patch({ volume: 0.5 });
      flush();
      await Promise.resolve();

      expect(host.updateCount).toBe(updateCountBefore);
    });

    it('resubscribes on reconnect', async () => {
      const state = createState({ volume: 1, muted: false });
      const host = createTestHost();

      const controller = new SnapshotController(host, state, (s) => s.volume);
      document.body.appendChild(host);

      expect(controller.value).toBe(1);

      host.remove();

      state.patch({ volume: 0.8 });
      flush();

      // Reconnect
      document.body.appendChild(host);

      expect(controller.value).toBe(0.8);
    });
  });

  describe('track', () => {
    it('switches to a different state container', async () => {
      const state1 = createState({ volume: 1, muted: false });
      const state2 = createState({ volume: 0.3, muted: true });
      const host = createTestHost();

      const controller = new SnapshotController(host, state1, (s) => s.volume);
      document.body.appendChild(host);

      expect(controller.value).toBe(1);

      controller.track(state2);

      expect(controller.value).toBe(0.3);
    });

    it('unsubscribes from previous state on track', async () => {
      const state1 = createState({ volume: 1, muted: false });
      const state2 = createState({ volume: 0.5, muted: false });
      const host = createTestHost();

      const controller = new SnapshotController(host, state1, (s) => s.volume);
      document.body.appendChild(host);

      await Promise.resolve();

      // Switch to state2
      controller.track(state2);

      const countAfterTrack = host.updateCount;

      // Mutate state1 — should NOT trigger update
      state1.patch({ volume: 0.2 });
      flush();
      await Promise.resolve();

      expect(host.updateCount).toBe(countAfterTrack);
    });

    it('does not subscribe to a new state until a disconnected host reconnects', () => {
      const state1 = createState({ volume: 1 });
      const state2 = createState({ volume: 0.5 });
      const subscribe = vi.spyOn(state2, 'subscribe');
      const host = createTestHost();

      const controller = new SnapshotController(host, state1, (s) => s.volume);
      controller.track(state2);

      expect(controller.value).toBe(0.5);
      expect(subscribe).not.toHaveBeenCalled();

      document.body.appendChild(host);

      expect(subscribe).toHaveBeenCalledOnce();
    });

    it('does not resubscribe when already tracking the same state', () => {
      const state = createState({ volume: 1 });
      const subscribe = vi.spyOn(state, 'subscribe');
      const host = createTestHost();
      const controller = new SnapshotController(host, state, (s) => s.volume);

      document.body.appendChild(host);
      expect(subscribe).toHaveBeenCalledOnce();

      controller.track(state);

      expect(subscribe).toHaveBeenCalledOnce();
    });

    it('can stop and resume tracking the same state', () => {
      const state = createState({ volume: 1 });
      const host = createTestHost();
      const controller = new SnapshotController(host, state, (s) => s.volume);

      document.body.appendChild(host);
      controller.untrack();

      const updateCount = host.updateCount;
      state.replace({ volume: 0.5 });
      flush();
      expect(host.updateCount).toBe(updateCount);

      controller.track(state);
      state.replace({ volume: 0.25 });
      flush();

      expect(host.updateCount).toBe(updateCount + 1);
      expect(controller.value).toBe(0.25);
    });
  });
});
