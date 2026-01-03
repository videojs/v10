import { describe, expect, it } from 'vitest';

import { isEventLike } from '../event-like';

describe('event-like', () => {
  describe('isEventLike', () => {
    it('returns true for objects with type and timeStamp', () => {
      expect(isEventLike({ type: 'click', timeStamp: 123 })).toBe(true);
      expect(isEventLike({ type: 'play', timeStamp: 0 })).toBe(true);
      expect(isEventLike({ type: '', timeStamp: Date.now() })).toBe(true);
    });

    it('returns true for objects with additional properties', () => {
      expect(
        isEventLike({
          type: 'click',
          timeStamp: 123,
          isTrusted: true,
          target: null,
        }),
      ).toBe(true);
    });

    it('returns true for DOM Events', () => {
      const event = new Event('click');
      expect(isEventLike(event)).toBe(true);
    });

    it('returns true for CustomEvent', () => {
      const event = new CustomEvent('custom', { detail: { foo: 'bar' } });
      expect(isEventLike(event)).toBe(true);
    });

    it('returns false for missing type', () => {
      expect(isEventLike({ timeStamp: 123 })).toBe(false);
    });

    it('returns false for missing timeStamp', () => {
      expect(isEventLike({ type: 'click' })).toBe(false);
    });

    it('returns false for non-string type', () => {
      expect(isEventLike({ type: 123, timeStamp: 123 })).toBe(false);
      expect(isEventLike({ type: null, timeStamp: 123 })).toBe(false);
      expect(isEventLike({ type: undefined, timeStamp: 123 })).toBe(false);
    });

    it('returns false for non-number timeStamp', () => {
      expect(isEventLike({ type: 'click', timeStamp: '123' })).toBe(false);
      expect(isEventLike({ type: 'click', timeStamp: null })).toBe(false);
      expect(isEventLike({ type: 'click', timeStamp: undefined })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isEventLike(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isEventLike(undefined)).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(isEventLike('event')).toBe(false);
      expect(isEventLike(123)).toBe(false);
      expect(isEventLike(true)).toBe(false);
    });

    it('returns false for arrays', () => {
      expect(isEventLike([])).toBe(false);
      expect(isEventLike(['click', 123])).toBe(false);
    });

    it('returns false for functions', () => {
      expect(isEventLike(() => {})).toBe(false);
    });
  });
});
