import { describe, expect, it, vi } from 'vitest';
import { createSlice, resolveRequestCancelKeys, resolveRequestKey } from '../src/slice';

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

      const schedule = (flush: () => void) => {
        setTimeout(flush, 100);
      };

      const slice = createSlice({
        initialState: {},
        getSnapshot: () => ({}),
        subscribe: () => {},
        request: {
          configured: {
            key: 'custom-key',
            guard: [guard],
            schedule,
            handler: () => {},
          },
        },
      });

      expect(slice.request.configured.key).toBe('custom-key');
      expect(slice.request.configured.guard).toEqual([guard]);
      expect(slice.request.configured.schedule).toBe(schedule);
    });
  });

  describe('resolveRequestKey', () => {
    it('returns string key directly', () => {
      expect(resolveRequestKey('my-key', undefined)).toBe('my-key');
    });

    it('calls function with input', () => {
      const keyFn = (id: string) => `track-${id}`;
      expect(resolveRequestKey(keyFn, 'abc')).toBe('track-abc');
    });

    it('handles symbol keys', () => {
      const sym = Symbol('unique');
      expect(resolveRequestKey(sym, undefined)).toBe(sym);
    });
  });

  describe('resolveRequestCancelKeys', () => {
    it('returns empty array for undefined', () => {
      expect(resolveRequestCancelKeys(undefined, null)).toEqual([]);
    });

    it('wraps single key in array', () => {
      expect(resolveRequestCancelKeys('key', null)).toEqual(['key']);
    });

    it('returns array directly', () => {
      expect(resolveRequestCancelKeys(['a', 'b'], null)).toEqual(['a', 'b']);
    });

    it('calls function with input', () => {
      const cancelFn = (type: string) => [`${type}-loading`, `${type}-fetch`];
      expect(resolveRequestCancelKeys(cancelFn, 'video')).toEqual([
        'video-loading',
        'video-fetch',
      ]);
    });
  });
});
