import { describe, expect, it, vi } from 'vitest';

import { createFeature } from '../feature';

describe('feature', () => {
  describe('createFeature', () => {
    it('creates feature with all required properties', () => {
      interface Target {
        value: number;
      }

      const feature = createFeature<Target>()({
        initialState: { count: 0 },
        getSnapshot: ({ target }) => ({ count: target.value }),
        subscribe: vi.fn(),
        request: {
          increment: (amount: number, { target }) => {
            target.value += amount;
          },
        },
      });

      expect(feature.id).toBeTypeOf('symbol');
      expect(feature.initialState).toEqual({ count: 0 });
      expect(feature.getSnapshot).toBeTypeOf('function');
      expect(feature.subscribe).toBeTypeOf('function');
      expect(feature.request.increment).toMatchObject({
        key: 'increment',
        guard: [],
        handler: expect.any(Function),
      });
    });

    it('resolves shorthand handlers', () => {
      const feature = createFeature({
        initialState: {},
        getSnapshot: () => ({}),
        subscribe: () => {},
        request: {
          simple: () => 'result',
        },
      });

      expect(feature.request.simple.key).toBe('simple');
      expect(feature.request.simple.guard).toEqual([]);
      expect(feature.request.simple.cancel).toBeUndefined();
    });

    it('preserves full config options', () => {
      const guard = () => true;

      const feature = createFeature({
        initialState: {},
        getSnapshot: () => ({}),
        subscribe: () => {},
        request: {
          configured: {
            key: 'custom-key',
            guard: [guard],
            handler: () => {},
          },
        },
      });

      expect(feature.request.configured.key).toBe('custom-key');
      expect(feature.request.configured.guard).toEqual([guard]);
    });
  });
});
