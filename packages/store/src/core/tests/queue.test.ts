import { describe, expect, it, vi } from 'vitest';

import { createQueue } from '../queue';
import { flush, subscribe } from '../state';

describe('Queue', () => {
  describe('enqueue', () => {
    it('executes task immediately', async () => {
      const queue = createQueue();
      const handler = vi.fn().mockResolvedValue('result');

      const promise = queue.enqueue({
        name: 'test',
        key: 'test-key',
        handler,
      });

      // Handler called synchronously
      expect(handler).toHaveBeenCalled();
      await expect(promise).resolves.toBe('result');
    });

    it('task is pending synchronously after enqueue', async () => {
      const queue = createQueue();

      const promise = queue.enqueue({
        name: 'test',
        key: 'test-key',
        handler: async () => 'result',
      });

      // Synchronous check - task is pending immediately
      expect(queue.tasks.test?.status).toBe('pending');

      await promise;
      expect(queue.tasks.test?.status).toBe('success');
    });

    it('aborts pending task with same key', async () => {
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

  describe('abort', () => {
    it('abort(name) aborts pending task', async () => {
      const queue = createQueue();
      let aborted = false;

      const promise = queue.enqueue({
        name: 'test',
        key: 'k',
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

      await new Promise(r => setTimeout(r, 10));
      queue.abort('test');

      await expect(promise).rejects.toMatchObject({ code: 'ABORTED' });
      expect(aborted).toBe(true);
    });
  });

  describe('destroy', () => {
    it('rejects after destroy', async () => {
      const queue = createQueue();
      queue.destroy();

      await expect(queue.enqueue({ name: 't', key: 'k', handler: vi.fn() })).rejects.toMatchObject({
        code: 'DESTROYED',
      });
    });

    it('aborts all pending on destroy', async () => {
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

      await expect(promise).rejects.toMatchObject({ code: 'ABORTED' });
      expect(aborted).toHaveBeenCalled();
      expect(queue.destroyed).toBe(true);
    });

    it('clears all task references on destroy', async () => {
      const queue = createQueue();

      await queue.enqueue({ name: 'task', key: 'k', handler: async () => 'result' });
      expect(queue.tasks.task?.status).toBe('success');

      queue.destroy();

      expect(Reflect.ownKeys(queue.tasks).length).toBe(0);
    });
  });

  describe('cleanup edge cases', () => {
    it('allows pending tasks to self-cleanup after destroy', async () => {
      const queue = createQueue();
      const cleanupSpy = vi.fn();

      const promise = queue.enqueue({
        name: 'task',
        key: 'k',
        handler: async ({ signal }) => {
          signal.addEventListener('abort', () => cleanupSpy('aborted'));
          try {
            await new Promise((_, reject) => {
              signal.addEventListener('abort', () => reject(signal.reason));
            });
          } finally {
            cleanupSpy('cleanup');
          }
        },
      });

      await new Promise(r => setTimeout(r, 10));
      expect(queue.tasks.task?.status).toBe('pending');

      queue.destroy();

      await promise.catch(() => {});
      expect(cleanupSpy).toHaveBeenCalledWith('aborted');
      expect(cleanupSpy).toHaveBeenCalledWith('cleanup');
      expect(queue.tasks.task).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('subscribe returns an unsubscribe function', () => {
      const queue = createQueue();
      const listener = vi.fn();

      const unsubscribe = subscribe(queue.tasks, listener);

      expect(unsubscribe).toBeTypeOf('function');
    });

    it('notifies when task becomes pending', async () => {
      const queue = createQueue();
      const listener = vi.fn();

      subscribe(queue.tasks, listener);

      const promise = queue.enqueue({
        name: 'test',
        key: 'test-key',
        handler: vi.fn().mockResolvedValue('result'),
      });

      // Flush to trigger notifications (auto-batched)
      flush();

      await promise;
      flush();

      // Called when pending and when settled
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('unsubscribe stops notifications', async () => {
      const queue = createQueue();
      const listener = vi.fn();

      const unsubscribe = subscribe(queue.tasks, listener);
      unsubscribe();

      await queue.enqueue({
        name: 'test',
        key: 'test-key',
        handler: vi.fn().mockResolvedValue('result'),
      });
      flush();

      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple subscribers', async () => {
      const queue = createQueue();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      subscribe(queue.tasks, listener1);
      subscribe(queue.tasks, listener2);

      await queue.enqueue({
        name: 'test',
        key: 'test-key',
        handler: vi.fn().mockResolvedValue('result'),
      });
      flush();

      // Called once per batch (pending + settled batched together)
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('task lifecycle', () => {
    it('task starts as pending and transitions to success', async () => {
      const queue = createQueue();

      const promise = queue.enqueue({
        name: 'task',
        key: 'k',
        handler: async () => {
          await new Promise(r => setTimeout(r, 10));
          return 'result';
        },
      });

      await new Promise(r => setTimeout(r, 5));
      const pendingTask = queue.tasks.task;
      expect(pendingTask?.status).toBe('pending');
      expect(pendingTask?.name).toBe('task');

      await promise;

      const successTask = queue.tasks.task;
      expect(successTask?.status).toBe('success');
      if (successTask?.status === 'success') {
        expect(successTask.output).toBe('result');
        expect(successTask.settledAt).toBeGreaterThan(successTask.startedAt);
      }
    });

    it('task starts as pending and transitions to error', async () => {
      const queue = createQueue();
      const error = new Error('test error');

      const promise = queue.enqueue({
        name: 'task',
        key: 'k',
        handler: async () => {
          await new Promise(r => setTimeout(r, 10));
          throw error;
        },
      });

      await new Promise(r => setTimeout(r, 5));
      expect(queue.tasks.task?.status).toBe('pending');

      await expect(promise).rejects.toThrow('test error');

      const errorTask = queue.tasks.task;
      expect(errorTask?.status).toBe('error');
      if (errorTask?.status === 'error') {
        expect(errorTask.error).toBe(error);
        expect(errorTask.cancelled).toBe(false);
      }
    });

    it('aborted task has cancelled flag set to true', async () => {
      const queue = createQueue();

      const promise = queue.enqueue({
        name: 'task',
        key: 'k',
        handler: async ({ signal }) => {
          await new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason));
            setTimeout(() => {}, 1000);
          });
        },
      });

      await new Promise(r => setTimeout(r, 10));
      expect(queue.tasks.task?.status).toBe('pending');

      queue.abort('task');
      await promise.catch(() => {});

      const errorTask = queue.tasks.task;
      expect(errorTask?.status).toBe('error');
      if (errorTask?.status === 'error') {
        expect(errorTask.cancelled).toBe(true);
      }
    });

    it('new request replaces settled task', async () => {
      const queue = createQueue();

      await queue.enqueue({
        name: 'first',
        key: 'k',
        handler: async () => 'first-result',
      });

      expect(queue.tasks.first?.status).toBe('success');
      if (queue.tasks.first?.status === 'success') {
        expect(queue.tasks.first.output).toBe('first-result');
      }

      await queue.enqueue({
        name: 'second',
        key: 'k',
        handler: async () => 'second-result',
      });

      expect(queue.tasks.second?.status).toBe('success');
      if (queue.tasks.second?.status === 'success') {
        expect(queue.tasks.second.output).toBe('second-result');
        expect(queue.tasks.second.name).toBe('second');
      }
    });
  });

  describe('reset', () => {
    it('clears settled task', async () => {
      const queue = createQueue();

      await queue.enqueue({
        name: 'task',
        key: 'k',
        handler: async () => 'result',
      });

      expect(queue.tasks.task?.status).toBe('success');

      queue.reset('task');

      expect(queue.tasks.task).toBeUndefined();
    });

    it('is no-op when task is pending', async () => {
      const queue = createQueue();

      const promise = queue.enqueue({
        name: 'task',
        key: 'k',
        handler: async () => {
          await new Promise(r => setTimeout(r, 50));
          return 'result';
        },
      });

      await new Promise(r => setTimeout(r, 10));
      expect(queue.tasks.task?.status).toBe('pending');

      queue.reset('task');
      expect(queue.tasks.task?.status).toBe('pending');

      await promise;
    });

    it('is no-op when task does not exist', () => {
      const queue = createQueue();

      queue.reset('nonexistent');

      expect(queue.tasks.nonexistent).toBeUndefined();
    });

    it('notifies subscribers when reset clears a task', async () => {
      const queue = createQueue();
      const listener = vi.fn();

      await queue.enqueue({
        name: 'task',
        key: 'k',
        handler: async () => 'result',
      });

      subscribe(queue.tasks, listener);

      queue.reset('task');
      flush();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(queue.tasks.task).toBeUndefined();
    });

    it('does not notify subscribers when task does not exist', () => {
      const queue = createQueue();
      const listener = vi.fn();

      subscribe(queue.tasks, listener);
      queue.reset('nonexistent');
      flush();

      expect(listener).not.toHaveBeenCalled();
    });

    it('resets all settled tasks when no key provided', async () => {
      const queue = createQueue();

      await queue.enqueue({ name: 'a', key: 'a', handler: async () => 'a-result' });
      await queue.enqueue({ name: 'b', key: 'b', handler: async () => 'b-result' });

      expect(queue.tasks.a?.status).toBe('success');
      expect(queue.tasks.b?.status).toBe('success');

      queue.reset();

      expect(queue.tasks.a).toBeUndefined();
      expect(queue.tasks.b).toBeUndefined();
    });

    it('preserves pending tasks when resetting all', async () => {
      const queue = createQueue();

      await queue.enqueue({ name: 'settled', key: 'settled', handler: async () => 'done' });

      const pendingPromise = queue.enqueue({
        name: 'pending',
        key: 'pending',
        handler: async () => {
          await new Promise(r => setTimeout(r, 100));
          return 'pending-done';
        },
      });

      await new Promise(r => setTimeout(r, 10));
      expect(queue.tasks.settled?.status).toBe('success');
      expect(queue.tasks.pending?.status).toBe('pending');

      queue.reset();

      expect(queue.tasks.settled).toBeUndefined();
      expect(queue.tasks.pending?.status).toBe('pending');

      await pendingPromise;
    });
  });

  describe('tasks property', () => {
    it('returns reactive proxy', async () => {
      const queue = createQueue();
      await queue.enqueue({ name: 'task', key: 'k', handler: async () => 'result' });

      // Tasks is now a reactive proxy, not a frozen object
      expect(queue.tasks.task?.status).toBe('success');
    });

    it('reflects changes immediately', async () => {
      const queue = createQueue();
      const tasks = queue.tasks;

      await queue.enqueue({ name: 'first', key: 'k', handler: async () => 'first' });

      // Same reference reflects updates
      expect(tasks.first?.status).toBe('success');

      await queue.enqueue({ name: 'second', key: 'k', handler: async () => 'second' });

      expect(tasks.second?.status).toBe('success');
    });
  });

  describe('symbol keys', () => {
    it('supports symbol names', async () => {
      const queue = createQueue();
      const name = Symbol('task');

      await queue.enqueue({
        name: name as unknown as string,
        key: name,
        handler: async () => 'result',
      });

      const task = queue.tasks[name as unknown as string];
      expect(task?.status).toBe('success');
      if (task?.status === 'success') {
        expect(task.output).toBe('result');
      }
    });
  });

  describe('meta propagation', () => {
    it('meta defaults to null when not provided', async () => {
      const queue = createQueue();

      await queue.enqueue({
        name: 'task',
        key: 'k',
        handler: async () => 'result',
      });

      expect(queue.tasks.task?.meta).toBeNull();
    });
  });
});
