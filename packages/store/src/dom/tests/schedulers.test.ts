import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueue } from '../../core/queue';
import { idle, raf } from '../schedulers';

describe('dom schedulers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('raf', () => {
    it('creates a TaskScheduler', () => {
      const scheduler = raf();
      expect(scheduler).toBeTypeOf('function');
    });

    it('schedules flush on animation frame', async () => {
      const flush = vi.fn();
      const scheduler = raf();

      scheduler(flush);

      expect(flush).not.toHaveBeenCalled();
      await vi.runAllTimersAsync();
      expect(flush).toHaveBeenCalledOnce();
    });

    it('returns cancel function', async () => {
      const flush = vi.fn();
      const scheduler = raf();

      const cancel = scheduler(flush);

      expect(cancel).toBeTypeOf('function');
      cancel!();
      await vi.runAllTimersAsync();
      expect(flush).not.toHaveBeenCalled();
    });

    it('works with queue', async () => {
      const queue = createQueue();
      const handler = vi.fn().mockResolvedValue('result');

      const promise = queue.enqueue({
        name: 'raf-task',
        key: 'raf',
        schedule: raf(),
        handler,
      });

      expect(handler).not.toHaveBeenCalled();
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toBe('result');
    });
  });

  describe('idle', () => {
    it('creates a TaskScheduler', () => {
      const scheduler = idle();
      expect(scheduler).toBeTypeOf('function');
    });

    it('schedules flush when idle', async () => {
      const flush = vi.fn();
      const scheduler = idle();

      scheduler(flush);

      expect(flush).not.toHaveBeenCalled();
      await vi.runAllTimersAsync();
      expect(flush).toHaveBeenCalledOnce();
    });

    it('returns cancel function', async () => {
      const flush = vi.fn();
      const scheduler = idle();

      const cancel = scheduler(flush);

      expect(cancel).toBeTypeOf('function');
      cancel!();
      await vi.runAllTimersAsync();
      expect(flush).not.toHaveBeenCalled();
    });

    it('accepts options', async () => {
      const flush = vi.fn();
      const scheduler = idle({ timeout: 1000 });

      scheduler(flush);

      await vi.runAllTimersAsync();
      expect(flush).toHaveBeenCalledOnce();
    });

    it('works with queue', async () => {
      const queue = createQueue();
      const handler = vi.fn().mockResolvedValue('idle-result');

      const promise = queue.enqueue({
        name: 'idle-task',
        key: 'idle',
        schedule: idle(),
        handler,
      });

      expect(handler).not.toHaveBeenCalled();
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toBe('idle-result');
    });
  });

  describe('integration', () => {
    it('different schedulers can coexist in same queue', async () => {
      const queue = createQueue();
      const order: string[] = [];

      queue.enqueue({
        name: 'raf-task',
        key: 'raf',
        schedule: raf(),
        handler: async () => {
          order.push('raf');
        },
      });

      queue.enqueue({
        name: 'idle-task',
        key: 'idle',
        schedule: idle(),
        handler: async () => {
          order.push('idle');
        },
      });

      await vi.runAllTimersAsync();

      expect(order).toContain('raf');
      expect(order).toContain('idle');
    });

    it('superseding works with raf scheduler', async () => {
      const queue = createQueue();
      const first = vi.fn().mockResolvedValue('first');
      const second = vi.fn().mockResolvedValue('second');

      const promise1 = queue.enqueue({
        name: 'first',
        key: 'shared',
        schedule: raf(),
        handler: first,
      });

      const promise2 = queue.enqueue({
        name: 'second',
        key: 'shared',
        schedule: raf(),
        handler: second,
      });

      // Handle the rejection immediately to avoid unhandled rejection warning
      promise1.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise1).rejects.toThrow();
      await expect(promise2).resolves.toBe('second');
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledOnce();
    });
  });
});
