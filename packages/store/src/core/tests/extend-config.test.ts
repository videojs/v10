import type { StoreConfig } from '../store';

import { describe, expect, it, vi } from 'vitest';

import { extendConfig } from '../extend-config';
import { Queue } from '../queue';
import { createSlice } from '../slice';
import { State } from '../state';

// Test target type
interface TestTarget {
  value: number;
}

// Helper to create test slices with explicit id
function createTestSlice(name: string, id?: symbol) {
  const slice = createSlice<TestTarget>()({
    initialState: { [`${name}State`]: 0 },
    getSnapshot: () => ({ [`${name}State`]: 0 }),
    subscribe: () => {},
    request: {
      [`${name}Action`]: () => {},
    },
  });

  // Override id if provided (for deduplication tests)
  if (id) {
    return { ...slice, id };
  }

  return slice;
}

// Helper to create a typed base config
function createBaseConfig<S extends ReturnType<typeof createTestSlice>[]>(
  slices: S,
  extra?: Partial<StoreConfig<TestTarget, S>>,
): StoreConfig<TestTarget, S> {
  return { slices, ...extra } as StoreConfig<TestTarget, S>;
}

describe('extendConfig', () => {
  describe('no extension', () => {
    it('returns base config unchanged when extension is undefined', () => {
      const slice = createTestSlice('a');
      const base = createBaseConfig([slice]);

      const result = extendConfig(base);

      expect(result).toBe(base);
    });

    it('returns base config unchanged when extension is empty object', () => {
      const slice = createTestSlice('a');
      const base = createBaseConfig([slice]);

      const result = extendConfig(base, {});

      expect(result.slices).toHaveLength(1);
      expect(result.slices[0]).toBe(slice);
    });
  });

  describe('slice merging', () => {
    it('concatenates slices from base and extension', () => {
      const sliceA = createTestSlice('a');
      const sliceB = createTestSlice('b');

      const base = createBaseConfig([sliceA]);
      const extension = { slices: [sliceB] };

      const result = extendConfig(base, extension);

      expect(result.slices).toHaveLength(2);
      expect(result.slices).toContain(sliceA);
      expect(result.slices).toContain(sliceB);
    });

    it('deduplicates slices by id, keeping last occurrence', () => {
      const sharedId = Symbol('shared');
      const sliceA = createTestSlice('a', sharedId);
      const sliceB = createTestSlice('b');

      // Create a "new version" of sliceA with same id
      const sliceAExtended = createTestSlice('aExtended', sharedId);

      const base = createBaseConfig([sliceA, sliceB]);
      const extension = { slices: [sliceAExtended] };

      const result = extendConfig(base, extension);

      // Should have sliceB and sliceAExtended (not original sliceA)
      expect(result.slices).toHaveLength(2);
      expect(result.slices).toContain(sliceB);
      expect(result.slices).toContain(sliceAExtended);
      expect(result.slices).not.toContain(sliceA);
    });
  });

  describe('lifecycle hooks', () => {
    it('composes onSetup hooks, calling base first', () => {
      const order: string[] = [];
      const baseOnSetup = vi.fn(() => order.push('base'));
      const extOnSetup = vi.fn(() => order.push('ext'));

      const slice = createTestSlice('a');
      const base = createBaseConfig([slice], { onSetup: baseOnSetup });
      const extension = { onSetup: extOnSetup };

      const result = extendConfig(base, extension);
      result.onSetup?.({} as any);

      expect(order).toEqual(['base', 'ext']);
      expect(baseOnSetup).toHaveBeenCalled();
      expect(extOnSetup).toHaveBeenCalled();
    });

    it('composes onAttach hooks, calling base first', () => {
      const order: string[] = [];
      const baseOnAttach = vi.fn(() => order.push('base'));
      const extOnAttach = vi.fn(() => order.push('ext'));

      const slice = createTestSlice('a');
      const base = createBaseConfig([slice], { onAttach: baseOnAttach });
      const extension = { onAttach: extOnAttach };

      const result = extendConfig(base, extension);
      result.onAttach?.({} as any);

      expect(order).toEqual(['base', 'ext']);
    });

    it('composes onError hooks, calling base first', () => {
      const order: string[] = [];
      const baseOnError = vi.fn(() => order.push('base'));
      const extOnError = vi.fn(() => order.push('ext'));

      const slice = createTestSlice('a');
      const base = createBaseConfig([slice], { onError: baseOnError });
      const extension = { onError: extOnError };

      const result = extendConfig(base, extension);
      result.onError?.({} as any);

      expect(order).toEqual(['base', 'ext']);
    });

    it('returns base hook when extension has none', () => {
      const baseOnSetup = vi.fn();

      const slice = createTestSlice('a');
      const base = createBaseConfig([slice], { onSetup: baseOnSetup });

      const result = extendConfig(base, {});

      expect(result.onSetup).toBe(baseOnSetup);
    });

    it('returns extension hook when base has none', () => {
      const extOnSetup = vi.fn();

      const slice = createTestSlice('a');
      const base = createBaseConfig([slice]);
      const extension = { onSetup: extOnSetup };

      const result = extendConfig(base, extension);

      expect(result.onSetup).toBe(extOnSetup);
    });

    it('returns undefined when neither has hook', () => {
      const slice = createTestSlice('a');
      const base = createBaseConfig([slice]);

      const result = extendConfig(base, {});

      expect(result.onSetup).toBeUndefined();
    });
  });

  describe('queue and state', () => {
    it('uses extension queue when provided', () => {
      const baseQueue = new Queue();
      const extQueue = new Queue();

      const slice = createTestSlice('a');
      const base = createBaseConfig([slice], { queue: baseQueue as any });
      const extension = { queue: extQueue as any };

      const result = extendConfig(base, extension);

      expect(result.queue).toBe(extQueue);
    });

    it('falls back to base queue when extension has none', () => {
      const baseQueue = new Queue();

      const slice = createTestSlice('a');
      const base = createBaseConfig([slice], { queue: baseQueue as any });

      const result = extendConfig(base, {});

      expect(result.queue).toBe(baseQueue);
    });

    it('uses extension state factory when provided', () => {
      const baseState = (initial: any) => new State(initial);
      const extState = (initial: any) => new State(initial);

      const slice = createTestSlice('a');
      const base = createBaseConfig([slice], { state: baseState });
      const extension = { state: extState };

      const result = extendConfig(base, extension);

      expect(result.state).toBe(extState);
    });

    it('falls back to base state factory when extension has none', () => {
      const baseState = (initial: any) => new State(initial);

      const slice = createTestSlice('a');
      const base = createBaseConfig([slice], { state: baseState });

      const result = extendConfig(base, {});

      expect(result.state).toBe(baseState);
    });
  });
});
