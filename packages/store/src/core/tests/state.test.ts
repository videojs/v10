import { describe, expect, it, vi } from 'vitest';

import { batch, flush, isReactive, reactive, snapshot, subscribe, subscribeKeys } from '../state';

describe('reactive', () => {
  interface TestState {
    volume: number;
    muted: boolean;
    currentTime: number;
  }

  const createState = () =>
    reactive<TestState>({
      volume: 1,
      muted: false,
      currentTime: 0,
    });

  describe('reactive', () => {
    it('creates reactive state', () => {
      const s = createState();
      expect(s.volume).toBe(1);
      expect(s.muted).toBe(false);
    });

    it('allows direct mutation', () => {
      const s = createState();
      s.volume = 0.5;
      expect(s.volume).toBe(0.5);
    });

    it('tracks reactive via isReactive', () => {
      const s = createState();
      expect(isReactive(s)).toBe(true);
      expect(isReactive({})).toBe(false);
      expect(isReactive(null)).toBe(false);
      expect(isReactive(undefined)).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('notifies on change after microtask', async () => {
      const p = createState();
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
      const p = createState();
      const listener = vi.fn();
      subscribe(p, listener);

      p.volume = 0.5;
      expect(listener).not.toHaveBeenCalled();

      flush();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('does not notify on same value', () => {
      const p = createState();
      const listener = vi.fn();
      subscribe(p, listener);

      p.volume = 1; // same as initial
      flush();
      expect(listener).not.toHaveBeenCalled();
    });

    it('returns unsubscribe function', () => {
      const p = createState();
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
      const p = createState();
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
      const p = createState();
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
      const p = createState();
      const listener = vi.fn();
      subscribe(p, listener);

      p.volume = 0.5;
      p.muted = true;
      p.currentTime = 10;

      flush();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('explicit batch() groups mutations', () => {
      const p = createState();
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
      const p = createState();
      const snap = snapshot(p);

      expect(snap).toEqual({ volume: 1, muted: false, currentTime: 0 });
      expect(Object.isFrozen(snap)).toBe(true);
    });

    it('snapshot is independent of future changes', () => {
      const p = createState();
      const snap = snapshot(p);

      p.volume = 0.5;
      expect(snap.volume).toBe(1);
    });
  });

  describe('parent bubbling', () => {
    it('notifies parent when child changes', () => {
      const parent = reactive<{ nested: { value: number } }>({
        nested: { value: 0 },
      });
      const parentListener = vi.fn();
      subscribe(parent, parentListener);

      parent.nested.value = 42;
      flush();

      expect(parentListener).toHaveBeenCalledOnce();
    });

    it('auto-wraps nested objects', () => {
      const s = reactive<{ nested?: { value: number } }>({});

      s.nested = { value: 0 };
      expect(isReactive(s.nested)).toBe(true);

      const listener = vi.fn();
      subscribe(s, listener);

      s.nested.value = 42;
      flush();

      expect(listener).toHaveBeenCalledOnce();
    });

    it('subscribeKeys on parent fires when nested child changes', () => {
      const s = reactive<{ nested: { value: number }; other: number }>({
        nested: { value: 0 },
        other: 0,
      });
      const nestedListener = vi.fn();
      const otherListener = vi.fn();

      subscribeKeys(s, ['nested'], nestedListener);
      subscribeKeys(s, ['other'], otherListener);

      s.nested.value = 42;
      flush();

      expect(nestedListener).toHaveBeenCalledOnce();
      expect(otherListener).not.toHaveBeenCalled();
    });

    it('bubbles correct key through multiple levels', () => {
      const s = reactive<{ a: { b: { c: number } } }>({
        a: { b: { c: 0 } },
      });
      const listener = vi.fn();
      subscribeKeys(s, ['a'], listener);

      s.a.b.c = 42;
      flush();

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('delete property', () => {
    it('notifies on property deletion', () => {
      const s = reactive<{ value?: number }>({ value: 1 });
      const listener = vi.fn();
      subscribe(s, listener);

      delete s.value;
      flush();

      expect(listener).toHaveBeenCalledOnce();
      expect(s.value).toBeUndefined();
    });
  });
});
