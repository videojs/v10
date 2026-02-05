import { describe, expect, it, vi } from 'vitest';
import type { StateConfig } from '../create-state';
import { createState, isState } from '../create-state';

describe('createState', () => {
  describe('factory function', () => {
    it('creates a state container with initial value', () => {
      const state = createState({ count: 0 });

      expect(state.current).toEqual({ count: 0 });
    });

    it('accepts optional config parameter', () => {
      const config: StateConfig<{ count: number }> = {
        equalityFn: (a, b) => a.count === b.count,
      };
      const state = createState({ count: 0 }, config);

      expect(state.current).toEqual({ count: 0 });
    });

    it('does not use initial object reference directly', () => {
      const initial = { count: 0 };
      const state = createState(initial);

      // Should be a new object (frozen copy), not the same reference
      expect(state.current).not.toBe(initial);
      expect(state.current).toEqual(initial);
    });

    it('protects against mutation of initial object', () => {
      const initial = { count: 0 };
      const state = createState(initial);

      // Mutating the original should not affect state
      initial.count = 999;

      expect(state.current.count).toBe(0);
    });

    it('creates independent state containers', () => {
      const state1 = createState({ value: 1 });
      const state2 = createState({ value: 2 });

      expect(state1.current).not.toBe(state2.current);
      expect(state1.current.value).toBe(1);
      expect(state2.current.value).toBe(2);
    });
  });

  describe('patch', () => {
    it('updates state with partial object', () => {
      const state = createState({ count: 0, name: 'test' });

      state.patch({ count: 1 });

      expect(state.current).toEqual({ count: 1, name: 'test' });
    });

    it('creates new reference after patch', () => {
      const state = createState({ count: 0 });
      const before = state.current;

      state.patch({ count: 1 });
      const after = state.current;

      expect(after).not.toBe(before);
    });

    it('uses Object.is for change detection', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();
      state.subscribe(listener);

      // Same value (no change)
      state.patch({ count: 0 });
      state.flush();
      expect(listener).not.toHaveBeenCalled();

      // Different value (change)
      state.patch({ count: 1 });
      state.flush();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('handles multiple property updates in one patch', () => {
      const state = createState({ a: 1, b: 2, c: 3 });

      state.patch({ a: 10, c: 30 });

      expect(state.current).toEqual({ a: 10, b: 2, c: 30 });
    });

    it('does not trigger update when no values change', () => {
      const state = createState({ count: 0, name: 'test' });
      const listener = vi.fn();
      state.subscribe(listener);
      const before = state.current;

      state.patch({ count: 0, name: 'test' });
      state.flush();

      expect(state.current).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });

    it('handles undefined values', () => {
      const state = createState<{ value?: number | undefined }>({ value: 42 });

      state.patch({ value: undefined });

      expect(state.current.value).toBeUndefined();
    });

    it('handles null values', () => {
      const state = createState<{ value: number | null }>({ value: 42 });

      state.patch({ value: null });

      expect(state.current.value).toBeNull();
    });

    it('ignores inherited properties from partial', () => {
      const state = createState({ count: 0 });
      const prototype = { inherited: 'value' };
      const partial = Object.create(prototype);
      partial.count = 1;

      state.patch(partial);

      expect(state.current).toEqual({ count: 1 });
      expect('inherited' in state.current).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('notifies subscriber on state change', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);
      state.patch({ count: 1 });
      state.flush();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('returns unsubscribe function', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      const unsubscribe = state.subscribe(listener);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      state.patch({ count: 1 });
      state.flush();

      expect(listener).not.toHaveBeenCalled();
    });

    it('allows multiple subscribers', () => {
      const state = createState({ count: 0 });
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      state.subscribe(listener1);
      state.subscribe(listener2);
      state.patch({ count: 1 });
      state.flush();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('does not notify unsubscribed listeners', () => {
      const state = createState({ count: 0 });
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      state.subscribe(listener1);
      const unsubscribe2 = state.subscribe(listener2);

      unsubscribe2();
      state.patch({ count: 1 });
      state.flush();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).not.toHaveBeenCalled();
    });

    it('handles same listener subscribed multiple times', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);
      state.subscribe(listener);
      state.patch({ count: 1 });
      state.flush();

      // Set semantics: listener only called once even if added multiple times
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('safely handles unsubscribe called multiple times', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      const unsubscribe = state.subscribe(listener);

      unsubscribe();
      unsubscribe(); // Should not throw

      state.patch({ count: 1 });
      state.flush();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('batching via microtask', () => {
    it('batches multiple patches into single notification', async () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);

      // Multiple patches in same tick
      state.patch({ count: 1 });
      state.patch({ count: 2 });
      state.patch({ count: 3 });

      // Not notified yet
      expect(listener).not.toHaveBeenCalled();

      // Wait for microtask
      await Promise.resolve();

      // Single notification after flush
      expect(listener).toHaveBeenCalledTimes(1);
      expect(state.current.count).toBe(3);
    });

    it('batches updates across multiple state containers', async () => {
      const state1 = createState({ value: 0 });
      const state2 = createState({ value: 0 });
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      state1.subscribe(listener1);
      state2.subscribe(listener2);

      state1.patch({ value: 1 });
      state2.patch({ value: 2 });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();

      await Promise.resolve();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('schedules flush only once for multiple patches', async () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);

      state.patch({ count: 1 });
      state.patch({ count: 2 });
      state.patch({ count: 3 });

      await Promise.resolve();

      // Only one notification despite three patches
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies once when consecutive patches use identical values', async () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);

      // Multiple patches to the same new value
      state.patch({ count: 5 });
      state.patch({ count: 5 }); // Same value
      state.patch({ count: 5 }); // Same value

      await Promise.resolve();

      // Should notify once (0 → 5), not three times
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ count: 5 }),
        expect.objectContaining({ count: 0 })
      );
    });

    it('notifies once when consecutive identical patches with manual flush', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);

      // Multiple patches to the same new value
      state.patch({ count: 10 });
      state.patch({ count: 10 }); // Same value
      state.patch({ count: 10 }); // Same value

      state.flush();

      // Should notify once (0 → 10)
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ count: 10 }),
        expect.objectContaining({ count: 0 })
      );
    });

    it('does not notify when all patches are to current value', async () => {
      const state = createState({ count: 5 });
      const listener = vi.fn();

      state.subscribe(listener);

      // Multiple patches to the same value as initial
      state.patch({ count: 5 });
      state.patch({ count: 5 });
      state.patch({ count: 5 });

      await Promise.resolve();

      // Should not notify - no actual change from initial state
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('flush', () => {
    it('manually triggers pending notifications', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);
      state.patch({ count: 1 });

      expect(listener).not.toHaveBeenCalled();

      state.flush();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('clears pending state after flush', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);
      state.patch({ count: 1 });
      state.flush();

      expect(listener).toHaveBeenCalledTimes(1);

      // Second flush should not notify again
      state.flush();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not re-notify after automatic microtask flush', async () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);
      state.patch({ count: 1 });

      // Wait for automatic microtask flush
      await Promise.resolve();

      expect(listener).toHaveBeenCalledTimes(1);

      // Manual flush should not re-notify
      state.flush();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('can be called multiple times safely', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);

      state.flush();
      state.flush();
      state.flush();

      expect(listener).not.toHaveBeenCalled();
    });

    it('handles interleaved patches and flushes', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);

      state.patch({ count: 1 });
      state.flush();
      expect(listener).toHaveBeenCalledTimes(1);

      state.patch({ count: 2 });
      state.flush();
      expect(listener).toHaveBeenCalledTimes(2);

      state.patch({ count: 3 });
      state.flush();
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('only flushes its own pending notifications', () => {
      const state1 = createState({ value: 0 });
      const state2 = createState({ value: 0 });
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      state1.subscribe(listener1);
      state2.subscribe(listener2);

      state1.patch({ value: 1 });
      state2.patch({ value: 2 });

      // Each state flushes independently
      state1.flush();
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).not.toHaveBeenCalled();

      state2.flush();
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('type safety', () => {
    it('enforces type-safe state access', () => {
      interface AppState {
        count: number;
        name: string;
      }

      const state = createState<AppState>({ count: 0, name: 'test' });

      // TypeScript should allow valid access
      const count: number = state.current.count;
      const name: string = state.current.name;

      expect(count).toBe(0);
      expect(name).toBe('test');
    });

    it('enforces type-safe partial updates', () => {
      interface AppState {
        count: number;
        name: string;
      }

      const state = createState<AppState>({ count: 0, name: 'test' });

      // TypeScript should allow partial updates
      state.patch({ count: 1 });
      state.patch({ name: 'updated' });
      state.patch({ count: 2, name: 'both' });

      expect(state.current).toEqual({ count: 2, name: 'both' });
    });

    it('provides current state access', () => {
      const state = createState({ count: 0 });
      const current: { count: number } = state.current;

      expect(current.count).toBe(0);
    });
  });

  describe('selectors', () => {
    it('subscribes to derived state with selector', () => {
      const state = createState({ count: 0, name: 'test' });
      const listener = vi.fn();
      const selector = (s: { count: number; name: string }) => s.count;

      state.subscribe(selector, listener);
      state.patch({ count: 1 });
      state.flush();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(1, 0);
    });

    it('only notifies when selected value changes', () => {
      const state = createState({ count: 0, name: 'test' });
      const listener = vi.fn();
      const selector = (s: { count: number; name: string }) => s.count;

      state.subscribe(selector, listener);

      // Change name (not count)
      state.patch({ name: 'updated' });
      state.flush();
      expect(listener).not.toHaveBeenCalled();

      // Change count
      state.patch({ count: 1 });
      state.flush();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('returns unsubscribe function for selector subscriptions', () => {
      const state = createState({ count: 0, name: 'test' });
      const listener = vi.fn();
      const selector = (s: { count: number; name: string }) => s.count;

      const unsubscribe = state.subscribe(selector, listener);

      unsubscribe();
      state.patch({ count: 1 });
      state.flush();

      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple selector subscriptions', () => {
      const state = createState({ count: 0, name: 'test' });
      const countListener = vi.fn();
      const nameListener = vi.fn();
      const countSelector = (s: { count: number; name: string }) => s.count;
      const nameSelector = (s: { count: number; name: string }) => s.name;

      state.subscribe(countSelector, countListener);
      state.subscribe(nameSelector, nameListener);

      state.patch({ count: 1 });
      state.flush();

      expect(countListener).toHaveBeenCalledTimes(1);
      expect(nameListener).not.toHaveBeenCalled();

      state.patch({ name: 'updated' });
      state.flush();

      expect(countListener).toHaveBeenCalledTimes(1);
      expect(nameListener).toHaveBeenCalledTimes(1);
    });

    it('uses Object.is by default for selector equality', () => {
      const state = createState({ nested: { value: 1 } });
      const listener = vi.fn();
      const selector = (s: { nested: { value: number } }) => s.nested;

      state.subscribe(selector, listener);

      // Same object reference
      const obj = { value: 1 };
      state.patch({ nested: obj });
      state.flush();
      expect(listener).toHaveBeenCalledTimes(1);

      // Same reference again (no change)
      state.patch({ nested: obj });
      state.flush();
      expect(listener).toHaveBeenCalledTimes(1);

      // Different reference (even with same value)
      state.patch({ nested: { value: 1 } });
      state.flush();
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('uses custom equality function for selector', () => {
      const state = createState({ nested: { value: 1 } });
      const listener = vi.fn();
      const selector = (s: { nested: { value: number } }) => s.nested;
      const equalityFn = (a: { value: number }, b: { value: number }) => a.value === b.value;

      state.subscribe(selector, listener, { equalityFn });

      // Different reference but same value
      state.patch({ nested: { value: 1 } });
      state.flush();

      // Should not notify (custom equality says equal)
      expect(listener).not.toHaveBeenCalled();

      // Different value
      state.patch({ nested: { value: 2 } });
      state.flush();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ value: 2 }, { value: 1 });
    });

    it('handles selector returning primitives', () => {
      const state = createState({ count: 0, name: 'test' });
      const listener = vi.fn();
      const selector = (s: { count: number; name: string }) => s.count * 2;

      state.subscribe(selector, listener);
      state.patch({ count: 5 });
      state.flush();

      expect(listener).toHaveBeenCalledWith(10, 0);
    });

    it('handles selector returning objects', () => {
      const state = createState({ a: 1, b: 2, c: 3 });
      const listener = vi.fn();
      const selector = (s: { a: number; b: number; c: number }) => ({
        sum: s.a + s.b,
      });

      state.subscribe(selector, listener);
      state.patch({ a: 10 });
      state.flush();

      expect(listener).toHaveBeenCalledWith({ sum: 12 }, { sum: 3 });
    });

    it('batches selector notifications', async () => {
      const state = createState({ count: 0, name: 'test' });
      const listener = vi.fn();
      const selector = (s: { count: number; name: string }) => s.count;

      state.subscribe(selector, listener);

      state.patch({ count: 1 });
      state.patch({ count: 2 });
      state.patch({ count: 3 });

      await Promise.resolve();

      // Only one notification after batching
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(3, 0);
    });

    it('can mix full-state and selector subscriptions', () => {
      const state = createState({ count: 0, name: 'test' });
      const fullListener = vi.fn();
      const selectorListener = vi.fn();
      const selector = (s: { count: number; name: string }) => s.count;

      state.subscribe(fullListener);
      state.subscribe(selector, selectorListener);

      state.patch({ count: 1 });
      state.flush();

      expect(fullListener).toHaveBeenCalledTimes(1);
      expect(selectorListener).toHaveBeenCalledTimes(1);

      fullListener.mockClear();
      selectorListener.mockClear();

      // Change name (selector doesn't care)
      state.patch({ name: 'updated' });
      state.flush();

      expect(fullListener).toHaveBeenCalledTimes(1);
      expect(selectorListener).not.toHaveBeenCalled();
    });
  });

  describe('custom equality', () => {
    it('uses Object.is by default for change detection', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();
      state.subscribe(listener);

      // Object.is(NaN, NaN) returns true (unlike ===)
      state.patch({ count: Number.NaN });
      state.flush();
      expect(listener).toHaveBeenCalledTimes(1);

      state.patch({ count: Number.NaN });
      state.flush();
      // NaN equals NaN with Object.is, so no notification
      expect(listener).toHaveBeenCalledTimes(1);

      // But changing to a different value triggers
      state.patch({ count: 0 });
      state.flush();
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('accepts custom equality function in config', () => {
      const equalityFn = vi.fn(
        (a: { count: number; name: string }, b: { count: number; name: string }) => a.count === b.count
      );

      const state = createState({ count: 0, name: 'test' }, { equalityFn });
      const listener = vi.fn();
      state.subscribe(listener);

      // Change name but not count
      state.patch({ name: 'updated' });
      state.flush();

      expect(equalityFn).toHaveBeenCalled();
      // Custom equality says they're equal (same count)
      expect(listener).not.toHaveBeenCalled();

      // Change count
      state.patch({ count: 1 });
      state.flush();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not notify when batched patches result in equivalent state', () => {
      const equalityFn = (a: { count: number; name: string }, b: { count: number; name: string }) =>
        a.count === b.count;

      const state = createState({ count: 0, name: 'test' }, { equalityFn });
      const listener = vi.fn();
      state.subscribe(listener);

      // Multiple patches that end up at same count
      state.patch({ count: 1 });
      state.patch({ count: 2 });
      state.patch({ count: 0 }); // Back to original count

      state.flush();

      // Should not notify - final state is equivalent to initial state
      expect(listener).not.toHaveBeenCalled();
    });

    it('does not notify when batched patches result in equivalent state (async)', async () => {
      const equalityFn = (a: { count: number; name: string }, b: { count: number; name: string }) =>
        a.count === b.count;

      const state = createState({ count: 0, name: 'test' }, { equalityFn });
      const listener = vi.fn();
      state.subscribe(listener);

      // Multiple patches in same tick
      state.patch({ count: 5 });
      state.patch({ name: 'changed' });
      state.patch({ count: 0 }); // Back to original count

      // Wait for automatic flush
      await Promise.resolve();

      // Should not notify - final count equals initial count
      expect(listener).not.toHaveBeenCalled();
    });

    it('only notifies once when batched patches result in different state', () => {
      const equalityFn = (a: { count: number; name: string }, b: { count: number; name: string }) =>
        a.count === b.count;

      const state = createState({ count: 0, name: 'test' }, { equalityFn });
      const listener = vi.fn();
      state.subscribe(listener);

      // Multiple patches ending at different count
      state.patch({ count: 1 });
      state.patch({ count: 2 });
      state.patch({ count: 3 });
      state.patch({ name: 'updated' });

      state.flush();

      // Should notify once with final state
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ count: 3, name: 'updated' }),
        expect.objectContaining({ count: 0, name: 'test' })
      );
    });

    it('uses shallow equality when specified', () => {
      // Simple shallow equality implementation for test
      const shallowEqual = <T extends Record<string, unknown>>(a: T, b: T): boolean => {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((key) => Object.is(a[key], b[key]));
      };

      const state = createState({ count: 0, name: 'test' }, { equalityFn: shallowEqual });
      const listener = vi.fn();
      state.subscribe(listener);

      // Same values (shallow equal)
      state.patch({ count: 0, name: 'test' });
      state.flush();

      expect(listener).not.toHaveBeenCalled();

      // Different value
      state.patch({ count: 1 });
      state.flush();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not notify when batched patches with shallow equality end at same state', () => {
      const shallowEqual = <T extends Record<string, unknown>>(a: T, b: T): boolean => {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((key) => Object.is(a[key], b[key]));
      };

      const state = createState({ count: 0, name: 'test' }, { equalityFn: shallowEqual });
      const listener = vi.fn();
      state.subscribe(listener);

      // Multiple patches ending at original values
      state.patch({ count: 5 });
      state.patch({ name: 'changed' });
      state.patch({ count: 0, name: 'test' }); // Back to original

      state.flush();

      // Should not notify - shallow equal to initial state
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('isState', () => {
    it('returns true for state container', () => {
      const state = createState({ count: 0 });

      expect(isState(state)).toBe(true);
    });

    it('returns false for plain object', () => {
      const obj = { count: 0 };

      expect(isState(obj)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isState(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isState(undefined)).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(isState(42)).toBe(false);
      expect(isState('string')).toBe(false);
      expect(isState(true)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty state object', () => {
      const state = createState({});

      expect(state.current).toEqual({});
    });

    it('handles state with array values', () => {
      const state = createState({ items: [1, 2, 3] });

      state.patch({ items: [4, 5, 6] });

      expect(state.current.items).toEqual([4, 5, 6]);
    });

    it('handles state with nested objects', () => {
      const state = createState({ nested: { value: 42 } });

      state.patch({ nested: { value: 100 } });

      expect(state.current.nested.value).toBe(100);
    });

    it('handles rapid subscribe/unsubscribe', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn();

      const unsubscribe = state.subscribe(listener);
      unsubscribe();

      state.subscribe(listener);
      state.patch({ count: 1 });
      state.flush();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('handles patch during notification', () => {
      const state = createState({ count: 0 });
      const listener = vi.fn(() => {
        if (state.current.count === 1) {
          state.patch({ count: 2 });
        }
      });

      state.subscribe(listener);
      state.patch({ count: 1 });
      state.flush();

      // First notification
      expect(listener).toHaveBeenCalledTimes(1);
      expect(state.current.count).toBe(2);

      // Second flush for patch made during notification
      state.flush();
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });
});
