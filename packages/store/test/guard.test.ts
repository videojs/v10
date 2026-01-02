import { describe, expect, it, vi } from 'vitest';
import { StoreError } from '../src/errors';
import { all, any, timeout } from '../src/guard';

describe('guard', () => {
  const createContext = () => ({
    target: {},
    signal: new AbortController().signal,
  });

  describe('all', () => {
    it('passes when all guards return true', async () => {
      const guard = all(
        () => true,
        () => true,
        () => Promise.resolve(true),
      );
      expect(await guard(createContext())).toBe(true);
    });

    it('fails on first falsy guard', async () => {
      const thirdGuard = vi.fn(() => true);
      const guard = all(
        () => true,
        () => false,
        thirdGuard,
      );
      expect(await guard(createContext())).toBe(false);
      expect(thirdGuard).not.toHaveBeenCalled();
    });

    it('handles async guards', async () => {
      const guard = all(
        () => Promise.resolve(true),
        async () => {
          await new Promise(r => setTimeout(r, 10));
          return true;
        },
      );
      expect(await guard(createContext())).toBe(true);
    });

    it('fails on async falsy result', async () => {
      const guard = all(
        () => true,
        () => Promise.resolve(false),
      );
      expect(await guard(createContext())).toBe(false);
    });
  });

  describe('any', () => {
    it('passes on first truthy sync result', () => {
      const guard = any(
        () => false,
        () => true,
        () => false,
      );
      expect(guard(createContext())).toBe(true);
    });

    it('returns false when all sync guards fail', () => {
      const guard = any(
        () => false,
        () => false,
      );
      expect(guard(createContext())).toBe(false);
    });

    it('races async guards - first truthy wins', async () => {
      const guard = any(
        () => new Promise(r => setTimeout(() => r(false), 50)),
        () => new Promise(r => setTimeout(() => r(true), 10)),
        () => new Promise(r => setTimeout(() => r(false), 30)),
      );
      expect(await guard(createContext())).toBe(true);
    });

    it('returns false if all async guards resolve falsy', async () => {
      const guard = any(
        () => Promise.resolve(false),
        () => Promise.resolve(0),
        () => Promise.resolve(null),
      );
      expect(await guard(createContext())).toBe(false);
    });

    it('prefers sync truthy over pending async', () => {
      const guard = any(
        () => new Promise(() => {}), // never resolves
        () => true,
      );
      expect(guard(createContext())).toBe(true);
    });
  });

  describe('timeout', () => {
    it('passes sync truthy immediately', async () => {
      const guard = timeout(() => true, 1000);
      expect(await guard(createContext())).toBe(true);
    });

    it('fails sync falsy immediately', async () => {
      const guard = timeout(() => false, 1000);
      expect(await guard(createContext())).toBe(false);
    });

    it('passes async within timeout', async () => {
      const guard = timeout(
        () => new Promise(r => setTimeout(() => r(true), 10)),
        1000,
      );
      expect(await guard(createContext())).toBe(true);
    });

    it('throws StoreError on timeout', async () => {
      vi.useFakeTimers();

      const guard = timeout(
        () => new Promise(() => {}), // never resolves
        100,
        'waitForReady',
      );

      const promise = guard(createContext());
      vi.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow(StoreError);
      await expect(promise).rejects.toMatchObject({
        message: 'Timeout: waitForReady',
      });

      vi.useRealTimers();
    });

    it('clears timeout on abort', async () => {
      vi.useFakeTimers();

      const controller = new AbortController();
      const guard = timeout(
        () => new Promise(() => {}),
        100,
      );

      guard({ target: {}, signal: controller.signal });
      controller.abort();

      // Should not throw - timeout was cleared
      vi.advanceTimersByTime(200);

      vi.useRealTimers();
    });
  });
});
