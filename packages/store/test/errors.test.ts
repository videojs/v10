import { describe, expect, it } from 'vitest';
import {
  GuardTimeoutError,
  isRequestCancelledError,
  isStoreError,
  NoTargetError,
  RequestCancelledError,
  RequestSupersededError,
  StoreError,
} from '../src/errors';

describe('errors', () => {
  describe('storeError', () => {
    it('creates error with message', () => {
      const error = new StoreError('test message');
      expect(error.message).toBe('test message');
      expect(error.name).toBe('StoreError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('requestCancelledError', () => {
    it('uses default reason', () => {
      const error = new RequestCancelledError();
      expect(error.reason).toBe('Request cancelled');
    });

    it('accepts custom reason', () => {
      const error = new RequestCancelledError('User aborted');
      expect(error.reason).toBe('User aborted');
    });

    it('extends StoreError', () => {
      expect(new RequestCancelledError()).toBeInstanceOf(StoreError);
    });
  });

  describe('requestSupersededError', () => {
    it('has correct message', () => {
      const error = new RequestSupersededError();
      expect(error.message).toBe('Request superseded');
      expect(error.name).toBe('RequestSupersededError');
    });

    it('extends RequestCancelledError', () => {
      expect(new RequestSupersededError()).toBeInstanceOf(RequestCancelledError);
    });
  });

  describe('noTargetError', () => {
    it('has descriptive message', () => {
      const error = new NoTargetError();
      expect(error.message).toBe('No target attached to store');
    });
  });

  describe('guardTimeoutError', () => {
    it('includes guard name', () => {
      const error = new GuardTimeoutError('canPlay');
      expect(error.message).toBe('Guard timed out: canPlay');
      expect(error.guard).toBe('canPlay');
    });
  });

  describe('type guards', () => {
    it('isStoreError identifies store errors', () => {
      expect(isStoreError(new StoreError('test'))).toBe(true);
      expect(isStoreError(new RequestCancelledError())).toBe(true);
      expect(isStoreError(new Error('regular'))).toBe(false);
      expect(isStoreError(null)).toBe(false);
    });

    it('isRequestCancelledError identifies cancellation errors', () => {
      expect(isRequestCancelledError(new RequestCancelledError())).toBe(true);
      expect(isRequestCancelledError(new RequestSupersededError())).toBe(true);
      expect(isRequestCancelledError(new StoreError('other'))).toBe(false);
    });
  });
});
