import { describe, expect, it } from 'vitest';

import { isStoreError, StoreError } from '../errors';

describe('errors', () => {
  describe('storeError', () => {
    it('creates error with code only', () => {
      const error = new StoreError('ABORTED');
      expect(error.code).toBe('ABORTED');
      expect(error.message).toBe('ABORTED');
      expect(error.name).toBe('StoreError');
      expect(error).toBeInstanceOf(Error);
    });

    it('creates error with code and message', () => {
      const error = new StoreError('TIMEOUT', { message: 'Timeout: canPlay' });
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe('Timeout: canPlay');
    });

    it('supports cause for error chaining', () => {
      const cause = new Error('original error');
      const error = new StoreError('ABORTED', { cause });
      expect(error.code).toBe('ABORTED');
      expect(error.cause).toBe(cause);
    });

    it('supports both message and cause', () => {
      const cause = new Error('original');
      const error = new StoreError('TIMEOUT', { message: 'Timeout: guard', cause });
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe('Timeout: guard');
      expect(error.cause).toBe(cause);
    });
  });

  describe('type guard', () => {
    it('isStoreError identifies store errors', () => {
      expect(isStoreError(new StoreError('ABORTED'))).toBe(true);
      expect(isStoreError(new StoreError('REJECTED'))).toBe(true);
      expect(isStoreError(new Error('regular'))).toBe(false);
      expect(isStoreError(null)).toBe(false);
    });
  });
});
