import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestCancelledError } from '../src/errors';
import { createQueue, delay } from '../src/queue';

describe('queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('delay scheduler', () => {
    it('delays execution', async () => {
      const handler = vi.fn();
      const schedule = delay(100);

      const cancel = schedule(handler);

      expect(handler).not.toHaveBeenCalled();
      vi.advanceTimersByTime(99);
      expect(handler).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(handler).toHaveBeenCalledOnce();

      expect(cancel).toBeTypeOf('function');
    });

    it('cancel prevents execution', () => {
      const handler = vi.fn();
      const schedule = delay(100);

      const cancel = schedule(handler);
      vi.advanceTimersByTime(50);
      cancel!();
      vi.advanceTimersByTime(100);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('queue', () => {
    describe('enqueue', () => {
      it('executes task via default microtask scheduler', async () => {
        const queue = createQueue();
        const handler = vi.fn().mockResolvedValue('result');

        const promise = queue.enqueue({
          name: 'test',
          key: 'test-key',
          handler,
        });

        expect(handler).not.toHaveBeenCalled();
        await vi.runAllTimersAsync();
        await expect(promise).resolves.toBe('result');
      });

      it('executes with custom scheduler', async () => {
        const queue = createQueue({
          scheduler: (flush) => {
            const id = setTimeout(flush, 50);
            return () => clearTimeout(id);
          },
        });

        const handler = vi.fn().mockResolvedValue('done');
        const promise = queue.enqueue({
          name: 'delayed',
          key: 'key',
          handler,
        });

        expect(handler).not.toHaveBeenCalled();
        vi.advanceTimersByTime(50);
        await vi.runAllTimersAsync();
        await expect(promise).resolves.toBe('done');
      });

      it('supersedes queued task with same key', async () => {
        vi.useRealTimers(); // Use real timers for microtasks

        const queue = createQueue();
        const first = vi.fn().mockResolvedValue('first');
        const second = vi.fn().mockResolvedValue('second');

        const promise1 = queue.enqueue({ name: 'a', key: 'same', handler: first });
        const promise2 = queue.enqueue({ name: 'b', key: 'same', handler: second });

        await expect(promise1).rejects.toThrow(RequestCancelledError);
        await expect(promise2).resolves.toBe('second');
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledOnce();
      });

      it('aborts pending task with same key', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        let aborted = false;

        const longRunning = queue.enqueue({
          name: 'long',
          key: 'shared',
          handler: async ({ signal }) => {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(resolve, 1000);
              signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                aborted = true;
                reject(new Error('aborted'));
              });
            });
          },
        });

        // Let first task start
        await new Promise(r => setTimeout(r, 10));

        const superseding = queue.enqueue({
          name: 'supersede',
          key: 'shared',
          handler: async () => 'new result',
        });

        await expect(longRunning).rejects.toThrow();
        await expect(superseding).resolves.toBe('new result');
        expect(aborted).toBe(true);
      });

      it('parallel execution with different keys', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        const results: string[] = [];

        const task1 = queue.enqueue({
          name: 'task1',
          key: 'key-a',
          handler: async () => {
            results.push('a-start');
            await new Promise(r => setTimeout(r, 20));
            results.push('a-end');
            return 'a';
          },
        });

        const task2 = queue.enqueue({
          name: 'task2',
          key: 'key-b',
          handler: async () => {
            results.push('b-start');
            await new Promise(r => setTimeout(r, 10));
            results.push('b-end');
            return 'b';
          },
        });

        await Promise.all([task1, task2]);

        expect(results).toEqual(['a-start', 'b-start', 'b-end', 'a-end']);
      });
    });

    describe('dequeue', () => {
      it('removes queued task', async () => {
        const queue = createQueue({
          scheduler: delay(100),
        });

        const handler = vi.fn();
        const promise = queue.enqueue({ name: 'test', key: 'k', handler });

        expect(queue.dequeue('k')).toBe(true);
        expect(queue.dequeue('k')).toBe(false);

        vi.advanceTimersByTime(100);
        await expect(promise).rejects.toThrow(RequestCancelledError);
        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('clear', () => {
      it('clears all queued tasks', async () => {
        const queue = createQueue({ scheduler: delay(100) });

        const p1 = queue.enqueue({ name: 'a', key: 'a', handler: vi.fn() });
        const p2 = queue.enqueue({ name: 'b', key: 'b', handler: vi.fn() });

        queue.clear();
        vi.advanceTimersByTime(100);

        await expect(p1).rejects.toThrow(RequestCancelledError);
        await expect(p2).rejects.toThrow(RequestCancelledError);
        expect(queue.queued.size).toBe(0);
      });
    });

    describe('flush', () => {
      it('flush() executes all queued immediately', async () => {
        vi.useRealTimers();

        const queue = createQueue({ scheduler: delay(1000) });
        const handler = vi.fn().mockResolvedValue('ok');

        const promise = queue.enqueue({ name: 't', key: 'k', handler });

        queue.flush();
        await expect(promise).resolves.toBe('ok');
      });

      it('flush(key) executes specific task', async () => {
        vi.useRealTimers();

        const queue = createQueue({ scheduler: delay(1000) });
        const handlerA = vi.fn().mockResolvedValue('a');
        const handlerB = vi.fn().mockResolvedValue('b');

        queue.enqueue({ name: 'a', key: 'a', handler: handlerA });
        queue.enqueue({ name: 'b', key: 'b', handler: handlerB });

        queue.flush('a');
        await new Promise(r => setTimeout(r, 10));

        expect(handlerA).toHaveBeenCalled();
        expect(handlerB).not.toHaveBeenCalled();
      });
    });

    describe('abort', () => {
      it('abort(key) cancels queued and aborts pending', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        let aborted = false;

        const promise = queue.enqueue({
          name: 'test',
          key: 'k',
          handler: async ({ signal }) => {
            await new Promise((_, reject) => {
              signal.addEventListener('abort', () => {
                aborted = true;
                reject(new Error('aborted'));
              });
              setTimeout(() => {}, 1000);
            });
          },
        });

        await new Promise(r => setTimeout(r, 10));
        queue.abort('k', 'test abort');

        await expect(promise).rejects.toThrow();
        expect(aborted).toBe(true);
      });
    });

    describe('lifecycle hooks', () => {
      it('onDispatch called when task starts', async () => {
        vi.useRealTimers();

        const onDispatch = vi.fn();
        const queue = createQueue({ onDispatch });

        await queue.enqueue({
          name: 'myTask',
          key: 'k',
          input: { value: 42 },
          handler: async () => 'result',
        });

        expect(onDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'myTask',
            key: 'k',
            input: { value: 42 },
          }),
        );
      });

      it('onSettled called with success', async () => {
        vi.useRealTimers();

        const onSettled = vi.fn();
        const queue = createQueue({ onSettled });

        await queue.enqueue({
          name: 'task',
          key: 'k',
          handler: async () => 'done',
        });

        expect(onSettled).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'task' }),
          expect.objectContaining({ status: 'success' }),
        );
      });

      it('onSettled called with error status', async () => {
        vi.useRealTimers();

        const onSettled = vi.fn();
        const queue = createQueue({ onSettled });

        const promise = queue.enqueue({
          name: 'failing',
          key: 'k',
          handler: async () => {
            throw new Error('oops');
          },
        });

        await expect(promise).rejects.toThrow('oops');
        expect(onSettled).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ status: 'error' }),
        );
      });

      it('onSettled called with cancelled status', async () => {
        vi.useRealTimers();

        const onSettled = vi.fn();
        const queue = createQueue({ onSettled });

        const promise = queue.enqueue({
          name: 'first',
          key: 'k',
          handler: async () => new Promise(r => setTimeout(r, 100)),
        });

        await new Promise(r => setTimeout(r, 10));

        queue.enqueue({
          name: 'second',
          key: 'k',
          handler: async () => 'done',
        });

        await promise.catch(() => {});

        expect(onSettled).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'first' }),
          expect.objectContaining({ status: 'cancelled' }),
        );
      });
    });

    describe('destroy', () => {
      it('rejects after destroy', async () => {
        const queue = createQueue();
        queue.destroy();

        await expect(
          queue.enqueue({ name: 't', key: 'k', handler: vi.fn() }),
        ).rejects.toThrow('Queue destroyed');
      });

      it.only('aborts all pending on destroy', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        const aborted = vi.fn();

        const promise = queue.enqueue({
          name: 'task',
          key: 'k',
          handler: async ({ signal }) => {
            signal.addEventListener('abort', aborted);
            await new Promise(r => setTimeout(r, 100));
          },
        });

        await new Promise(r => setTimeout(r, 10));
        queue.destroy();

        await expect(promise).rejects.toThrow();
        expect(aborted).toHaveBeenCalled();
        expect(queue.destroyed).toBe(true);
      });
    });
  });
});
