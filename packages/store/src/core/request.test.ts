import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createRequestMeta,
  createRequestMetaFromEvent,
  isRequestMeta,
  REQUEST_META,
  resolveRequestCancelKeys,
  resolveRequestKey,
} from './request';

describe('request', () => {
  describe('meta', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('createRequestMeta', () => {
      it('creates meta with required fields', () => {
        const meta = createRequestMeta({
          source: 'user',
          context: undefined,
        });

        expect(meta[REQUEST_META]).toBe(true);
        expect(meta.source).toBe('user');
        expect(meta.timestamp).toBe(Date.now());
      });

      it('preserves provided timestamp', () => {
        const meta = createRequestMeta({
          source: 'system',
          timestamp: 12345,
          context: undefined,
        });

        expect(meta.timestamp).toBe(12345);
      });

      it('includes optional reason', () => {
        const meta = createRequestMeta({
          source: 'user',
          reason: 'button-click',
          context: { buttonId: 'play' },
        });

        expect(meta.reason).toBe('button-click');
        expect(meta.context).toEqual({ buttonId: 'play' });
      });
    });

    describe('isRequestMeta', () => {
      it('returns true for valid RequestMeta', () => {
        const meta = createRequestMeta({ source: 'test', context: undefined });
        expect(isRequestMeta(meta)).toBe(true);
      });

      it('returns false for plain objects', () => {
        expect(isRequestMeta({ source: 'test' })).toBe(false);
        expect(isRequestMeta({})).toBe(false);
      });

      it('returns false for non-objects', () => {
        expect(isRequestMeta(null)).toBe(false);
        expect(isRequestMeta(undefined)).toBe(false);
        expect(isRequestMeta('string')).toBe(false);
        expect(isRequestMeta(123)).toBe(false);
      });
    });

    describe('createRequestMetaFromEvent', () => {
      it('creates meta from trusted event', () => {
        const event = {
          type: 'click',
          timeStamp: 1000,
          isTrusted: true,
        };

        const meta = createRequestMetaFromEvent(event);

        expect(meta[REQUEST_META]).toBe(true);
        expect(meta.source).toBe('user');
        expect(meta.timestamp).toBe(1000);
        expect(meta.reason).toBe('click');
      });

      it('creates meta from synthetic event', () => {
        const event = {
          type: 'play',
          timeStamp: 2000,
          isTrusted: false,
        };

        const meta = createRequestMetaFromEvent(event);

        expect(meta.source).toBe('system');
      });

      it('includes context', () => {
        const event = { type: 'test', timeStamp: 0 };
        const context = { extra: 'data' };

        const meta = createRequestMetaFromEvent(event, context);

        expect(meta.context).toEqual({ extra: 'data' });
      });
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
      const sym = Symbol('@videojs/unique');
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
      expect(resolveRequestCancelKeys(cancelFn, 'video')).toEqual(['video-loading', 'video-fetch']);
    });
  });
});
