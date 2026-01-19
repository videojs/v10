import { describe, expect, it, vi } from 'vitest';

import { batch, flush, isProxy, proxy, snapshot, State, subscribe, subscribeKeys } from '../state';

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

// =============================================================================
// PROXY-BASED REACTIVITY TESTS
// =============================================================================

describe('proxy', () => {
  interface TestState {
    volume: number;
    muted: boolean;
    currentTime: number;
  }

  const createProxy = () =>
    proxy<TestState>({
      volume: 1,
      muted: false,
      currentTime: 0,
    });

  describe('proxy', () => {
    it('creates a reactive proxy', () => {
      const p = createProxy();
      expect(p.volume).toBe(1);
      expect(p.muted).toBe(false);
    });

    it('allows direct mutation', () => {
      const p = createProxy();
      p.volume = 0.5;
      expect(p.volume).toBe(0.5);
    });

    it('tracks proxy via isProxy', () => {
      const p = createProxy();
      expect(isProxy(p)).toBe(true);
      expect(isProxy({})).toBe(false);
      expect(isProxy(null)).toBe(false);
      expect(isProxy(undefined)).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('notifies on change after microtask', async () => {
      const p = createProxy();
      const listener = vi.fn();
      subscribe(p, listener);

      p.volume = 0.5;

      // Not called yet (deferred to microtask)
      expect(listener).not.toHaveBeenCalled();

      // Wait for microtask
      await Promise.resolve();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('can force immediate notification with flush()', () => {
      const p = createProxy();
      const listener = vi.fn();
      subscribe(p, listener);

      p.volume = 0.5;
      expect(listener).not.toHaveBeenCalled();

      flush();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('does not notify on same value', () => {
      const p = createProxy();
      const listener = vi.fn();
      subscribe(p, listener);

      p.volume = 1; // same as initial
      flush();
      expect(listener).not.toHaveBeenCalled();
    });

    it('returns unsubscribe function', () => {
      const p = createProxy();
      const listener = vi.fn();

      const unsub = subscribe(p, listener);
      p.volume = 0.5;
      flush();
      expect(listener).toHaveBeenCalledOnce();

      unsub();
      p.volume = 0.3;
      flush();
      expect(listener).toHaveBeenCalledOnce(); // still 1
    });
  });

  describe('subscribeKeys', () => {
    it('only notifies for specified keys', () => {
      const p = createProxy();
      const volumeListener = vi.fn();
      const mutedListener = vi.fn();

      subscribeKeys(p, ['volume'], volumeListener);
      subscribeKeys(p, ['muted'], mutedListener);

      p.volume = 0.5;
      flush();

      expect(volumeListener).toHaveBeenCalledOnce();
      expect(mutedListener).not.toHaveBeenCalled();

      p.muted = true;
      flush();

      expect(volumeListener).toHaveBeenCalledOnce();
      expect(mutedListener).toHaveBeenCalledOnce();
    });

    it('unsubscribes from all keys', () => {
      const p = createProxy();
      const listener = vi.fn();

      const unsub = subscribeKeys(p, ['volume', 'muted'], listener);
      unsub();

      p.volume = 0.5;
      p.muted = true;
      flush();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('batch', () => {
    it('batches multiple mutations into one notification', () => {
      const p = createProxy();
      const listener = vi.fn();
      subscribe(p, listener);

      p.volume = 0.5;
      p.muted = true;
      p.currentTime = 10;

      flush();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('explicit batch() groups mutations', () => {
      const p = createProxy();
      const listener = vi.fn();
      subscribe(p, listener);

      batch(() => {
        p.volume = 0.5;
        p.muted = true;
        p.currentTime = 10;
      });

      flush();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('batch() returns the result of the function', () => {
      const result = batch(() => 42);
      expect(result).toBe(42);
    });
  });

  describe('snapshot', () => {
    it('returns a frozen shallow copy', () => {
      const p = createProxy();
      const snap = snapshot(p);

      expect(snap).toEqual({ volume: 1, muted: false, currentTime: 0 });
      expect(Object.isFrozen(snap)).toBe(true);
    });

    it('snapshot is independent of future changes', () => {
      const p = createProxy();
      const snap = snapshot(p);

      p.volume = 0.5;
      expect(snap.volume).toBe(1);
    });
  });

  describe('parent bubbling', () => {
    it('notifies parent when child changes', () => {
      const parent = proxy<{ nested: { value: number } }>({
        nested: { value: 0 },
      });
      const parentListener = vi.fn();
      subscribe(parent, parentListener);

      parent.nested.value = 42;
      flush();

      expect(parentListener).toHaveBeenCalledOnce();
    });

    it('auto-proxies nested objects', () => {
      const p = proxy<{ nested?: { value: number } }>({});

      p.nested = { value: 0 };
      expect(isProxy(p.nested)).toBe(true);

      const listener = vi.fn();
      subscribe(p, listener);

      p.nested.value = 42;
      flush();

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('delete property', () => {
    it('notifies on property deletion', () => {
      const p = proxy<{ value?: number }>({ value: 1 });
      const listener = vi.fn();
      subscribe(p, listener);

      delete p.value;
      flush();

      expect(listener).toHaveBeenCalledOnce();
      expect(p.value).toBeUndefined();
    });
  });
});
