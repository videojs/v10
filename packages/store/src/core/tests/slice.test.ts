import { describe, expect, it, vi } from 'vitest';

import { createSlice } from '../slice';

describe('slice', () => {
  describe('createSlice', () => {
    it('creates slice with all required properties', () => {
      interface Target {
        value: number;
      }

      const slice = createSlice<Target>()({
        initialState: { count: 0 },
        getSnapshot: ({ target }) => ({ count: target.value }),
        subscribe: vi.fn(),
        request: {
          increment: (amount: number, { target }) => {
            target.value += amount;
          },
        },
      });

      expect(slice.id).toBeTypeOf('symbol');
      expect(slice.initialState).toEqual({ count: 0 });
      expect(slice.getSnapshot).toBeTypeOf('function');
      expect(slice.subscribe).toBeTypeOf('function');
      expect(slice.request.increment).toMatchObject({
        key: 'increment',
        guard: [],
        handler: expect.any(Function),
      });
    });

    it('resolves shorthand handlers', () => {
      const slice = createSlice({
        initialState: {},
        getSnapshot: () => ({}),
        subscribe: () => {},
        request: {
          simple: () => 'result',
        },
      });

      expect(slice.request.simple.key).toBe('simple');
      expect(slice.request.simple.guard).toEqual([]);
      expect(slice.request.simple.cancel).toBeUndefined();
    });

    it('preserves full config options', () => {
      const guard = () => true;

      const slice = createSlice({
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

      expect(slice.request.configured.key).toBe('custom-key');
      expect(slice.request.configured.guard).toEqual([guard]);
    });
  });
});
