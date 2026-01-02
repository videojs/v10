import { describe, expect, it, vi } from 'vitest';
import { State } from '../src/state';

describe('state', () => {
  interface TestState {
    volume: number;
    muted: boolean;
    currentTime: number;
  }

  const createState = () =>
    new State<TestState>({
      volume: 1,
      muted: false,
      currentTime: 0,
    });

  describe('value', () => {
    it('returns current state', () => {
      const state = createState();
      expect(state.value).toEqual({
        volume: 1,
        muted: false,
        currentTime: 0,
      });
    });

    it('value is immutable reference', () => {
      const state = createState();
      const first = state.value;
      state.set('volume', 0.5);
      expect(first).not.toBe(state.value);
      expect(first.volume).toBe(1);
    });
  });

  describe('set', () => {
    it('updates single key', () => {
      const state = createState();
      state.set('volume', 0.5);
      expect(state.value.volume).toBe(0.5);
    });

    it('does not notify on same value', () => {
      const state = createState();
      const listener = vi.fn();
      state.subscribe(listener);

      state.set('volume', 1); // same as initial
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('patch', () => {
    it('updates multiple keys', () => {
      const state = createState();
      state.patch({ volume: 0.5, muted: true });

      expect(state.value).toMatchObject({
        volume: 0.5,
        muted: true,
      });
    });

    it('only notifies for changed keys', () => {
      const state = createState();
      const listener = vi.fn();
      state.subscribeKeys(['volume'], listener);

      state.patch({ volume: 1, muted: true }); // volume unchanged
      expect(listener).not.toHaveBeenCalled();

      state.patch({ volume: 0.5 });
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('subscribe', () => {
    it('calls listener on any change', () => {
      const state = createState();
      const listener = vi.fn();
      state.subscribe(listener);

      state.set('volume', 0.5);
      expect(listener).toHaveBeenCalledWith(state.value);

      state.set('muted', true);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('returns unsubscribe function', () => {
      const state = createState();
      const listener = vi.fn();

      const unsub = state.subscribe(listener);
      state.set('volume', 0.5);
      expect(listener).toHaveBeenCalledOnce();

      unsub();
      state.set('volume', 0.3);
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('subscribeKeys', () => {
    it('only notifies for specified keys', () => {
      const state = createState();
      const volumeListener = vi.fn();
      const mutedListener = vi.fn();

      state.subscribeKeys(['volume'], volumeListener);
      state.subscribeKeys(['muted'], mutedListener);

      state.set('volume', 0.5);
      expect(volumeListener).toHaveBeenCalledOnce();
      expect(mutedListener).not.toHaveBeenCalled();

      state.set('muted', true);
      expect(volumeListener).toHaveBeenCalledOnce();
      expect(mutedListener).toHaveBeenCalledOnce();
    });

    it('notifies once per change even with multiple keys', () => {
      const state = createState();
      const listener = vi.fn();
      state.subscribeKeys(['volume', 'muted'], listener);

      state.patch({ volume: 0.5, muted: true });
      expect(listener).toHaveBeenCalledOnce();
    });

    it('unsubscribes from all keys', () => {
      const state = createState();
      const listener = vi.fn();

      const unsub = state.subscribeKeys(['volume', 'muted'], listener);
      unsub();

      state.set('volume', 0.5);
      state.set('muted', true);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
