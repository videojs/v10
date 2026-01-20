import type { StoreConfig } from '../store';

import { describe, expect, it, vi } from 'vitest';

import { extendConfig } from '../extend-config';
import { createFeature } from '../feature';
import { Queue } from '../queue';

// Test target type
interface TestTarget {
  value: number;
}

// Helper to create test features with explicit id
function createTestFeature(name: string, id?: symbol) {
  const feature = createFeature<TestTarget>()({
    initialState: { [`${name}State`]: 0 },
    getSnapshot: () => ({ [`${name}State`]: 0 }),
    subscribe: () => {},
    request: {
      [`${name}Action`]: () => {},
    },
  });

  // Override id if provided (for deduplication tests)
  if (id) {
    return { ...feature, id };
  }

  return feature;
}

// Helper to create a typed base config
function createBaseConfig<S extends ReturnType<typeof createTestFeature>[]>(
  features: S,
  extra?: Partial<StoreConfig<TestTarget, S>>,
): StoreConfig<TestTarget, S> {
  return { features, ...extra } as StoreConfig<TestTarget, S>;
}

describe('extendConfig', () => {
  describe('no extension', () => {
    it('returns base config unchanged when extension is undefined', () => {
      const feature = createTestFeature('a');
      const base = createBaseConfig([feature]);

      const result = extendConfig(base);

      expect(result).toBe(base);
    });

    it('returns base config unchanged when extension is empty object', () => {
      const feature = createTestFeature('a');
      const base = createBaseConfig([feature]);

      const result = extendConfig(base, {});

      expect(result.features).toHaveLength(1);
      expect(result.features[0]).toBe(feature);
    });
  });

  describe('feature merging', () => {
    it('concatenates features from base and extension', () => {
      const featureA = createTestFeature('a');
      const featureB = createTestFeature('b');

      const base = createBaseConfig([featureA]);
      const extension = { features: [featureB] };

      const result = extendConfig(base, extension);

      expect(result.features).toHaveLength(2);
      expect(result.features).toContain(featureA);
      expect(result.features).toContain(featureB);
    });

    it('deduplicates features by id, keeping last occurrence', () => {
      const sharedId = Symbol('shared');
      const featureA = createTestFeature('a', sharedId);
      const featureB = createTestFeature('b');

      // Create a "new version" of featureA with same id
      const featureAExtended = createTestFeature('aExtended', sharedId);

      const base = createBaseConfig([featureA, featureB]);
      const extension = { features: [featureAExtended] };

      const result = extendConfig(base, extension);

      // Should have featureB and featureAExtended (not original featureA)
      expect(result.features).toHaveLength(2);
      expect(result.features).toContain(featureB);
      expect(result.features).toContain(featureAExtended);
      expect(result.features).not.toContain(featureA);
    });
  });

  describe('lifecycle hooks', () => {
    it('composes onSetup hooks, calling base first', () => {
      const order: string[] = [];
      const baseOnSetup = vi.fn(() => order.push('base'));
      const extOnSetup = vi.fn(() => order.push('ext'));

      const feature = createTestFeature('a');
      const base = createBaseConfig([feature], { onSetup: baseOnSetup });
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

      const feature = createTestFeature('a');
      const base = createBaseConfig([feature], { onAttach: baseOnAttach });
      const extension = { onAttach: extOnAttach };

      const result = extendConfig(base, extension);
      result.onAttach?.({} as any);

      expect(order).toEqual(['base', 'ext']);
    });

    it('composes onError hooks, calling base first', () => {
      const order: string[] = [];
      const baseOnError = vi.fn(() => order.push('base'));
      const extOnError = vi.fn(() => order.push('ext'));

      const feature = createTestFeature('a');
      const base = createBaseConfig([feature], { onError: baseOnError });
      const extension = { onError: extOnError };

      const result = extendConfig(base, extension);
      result.onError?.({} as any);

      expect(order).toEqual(['base', 'ext']);
    });

    it('returns base hook when extension has none', () => {
      const baseOnSetup = vi.fn();

      const feature = createTestFeature('a');
      const base = createBaseConfig([feature], { onSetup: baseOnSetup });

      const result = extendConfig(base, {});

      expect(result.onSetup).toBe(baseOnSetup);
    });

    it('returns extension hook when base has none', () => {
      const extOnSetup = vi.fn();

      const feature = createTestFeature('a');
      const base = createBaseConfig([feature]);
      const extension = { onSetup: extOnSetup };

      const result = extendConfig(base, extension);

      expect(result.onSetup).toBe(extOnSetup);
    });

    it('returns undefined when neither has hook', () => {
      const feature = createTestFeature('a');
      const base = createBaseConfig([feature]);

      const result = extendConfig(base, {});

      expect(result.onSetup).toBeUndefined();
    });
  });

  describe('queue and state', () => {
    it('uses extension queue when provided', () => {
      const baseQueue = new Queue();
      const extQueue = new Queue();

      const feature = createTestFeature('a');
      const base = createBaseConfig([feature], { queue: baseQueue as any });
      const extension = { queue: extQueue as any };

      const result = extendConfig(base, extension);

      expect(result.queue).toBe(extQueue);
    });

    it('falls back to base queue when extension has none', () => {
      const baseQueue = new Queue();

      const feature = createTestFeature('a');
      const base = createBaseConfig([feature], { queue: baseQueue as any });

      const result = extendConfig(base, {});

      expect(result.queue).toBe(baseQueue);
    });
  });
});
