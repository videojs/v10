import { describe, expect, it } from 'vitest';

import { isStoreError, StoreError } from '../errors';

describe('errors', () => {
  describe('storeError', () => {
    it('creates error with message', () => {
      const error = new StoreError('test message');
      expect(error.message).toBe('test message');
      expect(error.name).toBe('StoreError');
      expect(error).toBeInstanceOf(Error);
    });

    it('supports cause for error chaining', () => {
      const cause = new Error('original error');
      const error = new StoreError('wrapped error', { cause });
      expect(error.message).toBe('wrapped error');
      expect(error.cause).toBe(cause);
    });
  });

  describe('type guard', () => {
    it('isStoreError identifies store errors', () => {
      expect(isStoreError(new StoreError('test'))).toBe(true);
      expect(isStoreError(new Error('regular'))).toBe(false);
      expect(isStoreError(null)).toBe(false);
    });
  });
});
