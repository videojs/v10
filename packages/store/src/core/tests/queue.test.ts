import { describe, expect, it, vi } from 'vitest';

import { Queue } from '../queue';

describe('Queue', () => {
  describe('enqueue', () => {
    it('executes handler immediately', async () => {
      const queue = new Queue();
      const handler = vi.fn().mockResolvedValue('result');

      const promise = queue.enqueue({
        key: 'test',
        handler,
      });

      expect(handler).toHaveBeenCalled();
      await expect(promise).resolves.toBe('result');
    });

    it('passes signal to handler', async () => {
      const queue = new Queue();
      let receivedSignal: AbortSignal | undefined;

      await queue.enqueue({
        key: 'test',
        handler: async ({ signal }) => {
          receivedSignal = signal;
          return 'result';
        },
      });

      expect(receivedSignal).toBeInstanceOf(AbortSignal);
    });

    it('supersedes pending task with same key', async () => {
      const queue = new Queue();
      let aborted = false;

      const first = queue.enqueue({
        key: 'shared',
        handler: async ({ signal }) => {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 1000);
            signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              aborted = true;
              reject(signal.reason);
            });
          });
        },
      });

      // Let first task start
      await new Promise((r) => setTimeout(r, 10));

      const second = queue.enqueue({
        key: 'shared',
        handler: async () => 'new result',
      });

      await expect(first).rejects.toMatchObject({ code: 'SUPERSEDED' });
      await expect(second).resolves.toBe('new result');
      expect(aborted).toBe(true);
    });

    it('runs tasks with different keys in parallel', async () => {
      const queue = new Queue();
      const results: string[] = [];

      const task1 = queue.enqueue({
        key: 'key-a',
        handler: async () => {
          results.push('a-start');
          await new Promise((r) => setTimeout(r, 20));
          results.push('a-end');
          return 'a';
        },
      });

      const task2 = queue.enqueue({
        key: 'key-b',
        handler: async () => {
          results.push('b-start');
          await new Promise((r) => setTimeout(r, 10));
          results.push('b-end');
          return 'b';
        },
      });

      await Promise.all([task1, task2]);

      expect(results).toEqual(['a-start', 'b-start', 'b-end', 'a-end']);
    });
  });

  describe('mode', () => {
    it('exclusive mode (default) supersedes same key', async () => {
      const queue = new Queue();

      const first = queue.enqueue({
        key: 'k',
        handler: async ({ signal }) => {
          await new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason));
            setTimeout(() => {}, 1000);
          });
        },
      });

      await new Promise((r) => setTimeout(r, 10));

      const second = queue.enqueue({
        key: 'k',
        mode: 'exclusive',
        handler: async () => 'second',
      });

      await expect(first).rejects.toMatchObject({ code: 'SUPERSEDED' });
      await expect(second).resolves.toBe('second');
    });

    it('shared mode joins existing promise with same key', async () => {
      const queue = new Queue();
      let callCount = 0;

      const handler = async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
        return 'result';
      };

      const first = queue.enqueue({ key: 'shared', mode: 'shared', handler });
      const second = queue.enqueue({ key: 'shared', mode: 'shared', handler });

      const [result1, result2] = await Promise.all([first, second]);

      expect(callCount).toBe(1);
      expect(result1).toBe('result');
      expect(result2).toBe('result');
    });

    it('shared mode creates new task after first completes', async () => {
      const queue = new Queue();
      let callCount = 0;

      const handler = async () => {
        callCount++;
        return `result-${callCount}`;
      };

      const first = await queue.enqueue({ key: 'shared', mode: 'shared', handler });
      const second = await queue.enqueue({ key: 'shared', mode: 'shared', handler });

      expect(callCount).toBe(2);
      expect(first).toBe('result-1');
      expect(second).toBe('result-2');
    });
  });

  describe('abort', () => {
    it('abort(key) aborts pending task with that key', async () => {
      const queue = new Queue();
      let aborted = false;

      const promise = queue.enqueue({
        key: 'test',
        handler: async ({ signal }) => {
          await new Promise((_, reject) => {
            signal.addEventListener('abort', () => {
              aborted = true;
              reject(signal.reason);
            });
            setTimeout(() => {}, 1000);
          });
        },
      });

      await new Promise((r) => setTimeout(r, 10));
      queue.abort('test');

      await expect(promise).rejects.toMatchObject({ code: 'ABORTED' });
      expect(aborted).toBe(true);
    });

    it('abort() without key aborts all pending tasks', async () => {
      const queue = new Queue();
      const abortedKeys: string[] = [];

      const taskA = queue.enqueue({
        key: 'a',
        handler: async ({ signal }) => {
          await new Promise((_, reject) => {
            signal.addEventListener('abort', () => {
              abortedKeys.push('a');
              reject(signal.reason);
            });
            setTimeout(() => {}, 1000);
          });
        },
      });

      const taskB = queue.enqueue({
        key: 'b',
        handler: async ({ signal }) => {
          await new Promise((_, reject) => {
            signal.addEventListener('abort', () => {
              abortedKeys.push('b');
              reject(signal.reason);
            });
            setTimeout(() => {}, 1000);
          });
        },
      });

      await new Promise((r) => setTimeout(r, 10));
      queue.abort();

      await expect(taskA).rejects.toMatchObject({ code: 'ABORTED' });
      await expect(taskB).rejects.toMatchObject({ code: 'ABORTED' });
      expect(abortedKeys).toContain('a');
      expect(abortedKeys).toContain('b');
    });

    it('abort(key) is no-op for non-existent key', () => {
      const queue = new Queue();
      // Should not throw
      queue.abort('nonexistent');
    });
  });

  describe('destroy', () => {
    it('rejects enqueue after destroy', async () => {
      const queue = new Queue();
      queue.destroy();

      await expect(queue.enqueue({ key: 'k', handler: vi.fn() })).rejects.toMatchObject({
        code: 'DESTROYED',
      });
    });

    it('sets destroyed flag', () => {
      const queue = new Queue();
      expect(queue.destroyed).toBe(false);

      queue.destroy();
      expect(queue.destroyed).toBe(true);
    });

    it('aborts all pending tasks on destroy', async () => {
      const queue = new Queue();
      const aborted = vi.fn();

      const promise = queue.enqueue({
        key: 'task',
        handler: async ({ signal }) => {
          signal.addEventListener('abort', aborted);
          await new Promise((r) => setTimeout(r, 100));
        },
      });

      await new Promise((r) => setTimeout(r, 10));
      queue.destroy();

      await expect(promise).rejects.toMatchObject({ code: 'ABORTED' });
      expect(aborted).toHaveBeenCalled();
    });

    it('destroy is idempotent', () => {
      const queue = new Queue();
      queue.destroy();
      queue.destroy(); // Should not throw
      expect(queue.destroyed).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('cleans up pending map after task completes', async () => {
      const queue = new Queue();

      await queue.enqueue({
        key: 'test',
        handler: async () => 'result',
      });

      // Enqueue same key should not supersede (no pending task exists)
      const handler = vi.fn().mockResolvedValue('new');
      await queue.enqueue({ key: 'test', handler });

      expect(handler).toHaveBeenCalled();
    });

    it('cleans up pending map after task fails', async () => {
      const queue = new Queue();

      await queue
        .enqueue({
          key: 'test',
          handler: async () => {
            throw new Error('fail');
          },
        })
        .catch(() => {});

      // Enqueue same key should work (no pending task to supersede)
      const handler = vi.fn().mockResolvedValue('new');
      await queue.enqueue({ key: 'test', handler });

      expect(handler).toHaveBeenCalled();
    });

    it('cleans up shared map after task completes', async () => {
      const queue = new Queue();
      let callCount = 0;

      await queue.enqueue({
        key: 'shared',
        mode: 'shared',
        handler: async () => {
          callCount++;
          return 'result';
        },
      });

      // Second call should create new task since first completed
      await queue.enqueue({
        key: 'shared',
        mode: 'shared',
        handler: async () => {
          callCount++;
          return 'result2';
        },
      });

      expect(callCount).toBe(2);
    });
  });

  describe('symbol keys', () => {
    it('supports symbol as key', async () => {
      const queue = new Queue();
      const key = Symbol('task');

      const result = await queue.enqueue({
        key,
        handler: async () => 'result',
      });

      expect(result).toBe('result');
    });

    it('supersedes by symbol key', async () => {
      const queue = new Queue();
      const key = Symbol('task');

      const first = queue.enqueue({
        key,
        handler: async ({ signal }) => {
          await new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason));
            setTimeout(() => {}, 1000);
          });
        },
      });

      await new Promise((r) => setTimeout(r, 10));

      const second = queue.enqueue({
        key,
        handler: async () => 'new',
      });

      await expect(first).rejects.toMatchObject({ code: 'SUPERSEDED' });
      await expect(second).resolves.toBe('new');
    });
  });
});
