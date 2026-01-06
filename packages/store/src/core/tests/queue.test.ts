import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueue, delay } from '../queue';

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

        await expect(promise1).rejects.toMatchObject({ code: 'SUPERSEDED' });
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

    describe('cancel', () => {
      it('cancel(name) removes specific queued task', async () => {
        const queue = createQueue({
          scheduler: delay(100),
        });

        const handler = vi.fn();
        const promise = queue.enqueue({ name: 'test', key: 'k', handler });

        expect(queue.cancel('test')).toBe(true);
        expect(queue.cancel('test')).toBe(false);

        vi.advanceTimersByTime(100);
        await expect(promise).rejects.toMatchObject({ code: 'REMOVED' });
        expect(handler).not.toHaveBeenCalled();
      });

      it('cancel() clears all queued tasks', async () => {
        const queue = createQueue({ scheduler: delay(100) });

        const p1 = queue.enqueue({ name: 'a', key: 'a', handler: vi.fn() });
        const p2 = queue.enqueue({ name: 'b', key: 'b', handler: vi.fn() });

        expect(queue.cancel()).toBe(true);
        vi.advanceTimersByTime(100);

        await expect(p1).rejects.toMatchObject({ code: 'REMOVED' });
        await expect(p2).rejects.toMatchObject({ code: 'REMOVED' });
        expect(Reflect.ownKeys(queue.queued).length).toBe(0);
      });

      it('cancel() returns false when no queued tasks', () => {
        const queue = createQueue();

        expect(queue.cancel()).toBe(false);
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

      it('flush(name) executes specific task', async () => {
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
      it('abort(name) cancels queued and aborts pending', async () => {
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

      it('onSettled called with success task', async () => {
        vi.useRealTimers();

        const onSettled = vi.fn();
        const queue = createQueue({ onSettled });

        await queue.enqueue({
          name: 'task',
          key: 'k',
          handler: async () => 'done',
        });

        expect(onSettled).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'task', status: 'success', output: 'done' }),
        );
      });

      it('onSettled called with error task', async () => {
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
        expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', cancelled: false }));
      });

      it('onSettled called with cancelled task', async () => {
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
          expect.objectContaining({ name: 'first', status: 'error', cancelled: true }),
        );
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

        await expect(promise).rejects.toMatchObject({ code: 'ABORTED' });
        expect(aborted).toHaveBeenCalled();
        expect(queue.destroyed).toBe(true);
      });
    });

    describe('cleanup edge cases', () => {
      it('explicitly removes superseded task from queue before adding new one', async () => {
        const queue = createQueue({ scheduler: delay(100) });

        // Enqueue first task
        const promise1 = queue.enqueue({
          name: 'task1',
          key: 'shared',
          handler: vi.fn().mockResolvedValue('result1'),
        });

        // Queue should have the first task (#queued is keyed by key 'shared')
        expect(Reflect.ownKeys(queue.queued).length).toBe(1);
        expect(queue.queued.shared?.name).toBe('task1');

        // Immediately enqueue second task with same key (supersedes first)
        const promise2 = queue.enqueue({
          name: 'task2',
          key: 'shared',
          handler: vi.fn().mockResolvedValue('result2'),
        });

        // First should be superseded
        await expect(promise1).rejects.toMatchObject({ code: 'SUPERSEDED' });

        // Queue should only have the second task (#queued keyed by key 'shared')
        expect(Reflect.ownKeys(queue.queued).length).toBe(1);
        expect(queue.queued.shared?.name).toBe('task2');

        // Second should succeed
        await vi.runAllTimersAsync();
        await expect(promise2).resolves.toBe('result2');
      });

      it('allows pending tasks to self-cleanup after destroy', async () => {
        vi.useRealTimers();

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

        // Wait for task to start
        await new Promise(r => setTimeout(r, 10));
        expect(queue.tasks.task?.status).toBe('pending');

        // Destroy queue
        queue.destroy();

        // Task should self-cleanup
        await promise.catch(() => {});
        expect(cleanupSpy).toHaveBeenCalledWith('aborted');
        expect(cleanupSpy).toHaveBeenCalledWith('cleanup');

        // After destroy, all tasks are cleared for memory cleanup
        expect(queue.tasks.task).toBeUndefined();
      });

      it('handles scheduler error without double-cleanup when already flushed', async () => {
        const queue = createQueue();
        let flushCalled = false;

        // Scheduler that flushes synchronously then throws
        const faultyScheduler = (flush: () => void) => {
          flush(); // Synchronous flush
          flushCalled = true;
          throw new Error('Scheduler error');
        };

        const promise = queue.enqueue({
          name: 'task',
          key: 'k',
          schedule: faultyScheduler,
          handler: vi.fn().mockResolvedValue('result'),
        });

        // Task was flushed despite scheduler error
        expect(flushCalled).toBe(true);

        // Promise should reject with scheduler error
        await expect(promise).rejects.toThrow('Scheduler error');

        // Task should not be in queued object (wasn't double-deleted)
        expect(Reflect.ownKeys(queue.queued).length).toBe(0);
      });

      it('handles scheduler error with cleanup when not yet flushed', async () => {
        const queue = createQueue();

        // Scheduler that throws before flushing
        const faultyScheduler = () => {
          throw new Error('Scheduler error');
        };

        const promise = queue.enqueue({
          name: 'task',
          key: 'k',
          schedule: faultyScheduler,
          handler: vi.fn().mockResolvedValue('result'),
        });

        // Promise should reject with scheduler error
        await expect(promise).rejects.toThrow('Scheduler error');

        // Task should be removed from queue
        expect(Reflect.ownKeys(queue.queued).length).toBe(0);
      });
    });

    describe('isPending and isQueued', () => {
      it('isPending returns true when task is executing', async () => {
        vi.useRealTimers();

        const queue = createQueue();

        const promise = queue.enqueue({
          name: 'test',
          key: 'test-key',
          handler: async () => {
            await new Promise(r => setTimeout(r, 50));
            return 'result';
          },
        });

        await new Promise(r => setTimeout(r, 10));

        expect(queue.isPending('test')).toBe(true);
        expect(queue.isPending('other')).toBe(false);

        await promise;

        expect(queue.isPending('test')).toBe(false);
      });

      it('isQueued returns true when task is waiting to execute', async () => {
        const queue = createQueue({ scheduler: delay(100) });

        queue.enqueue({
          name: 'test',
          key: 'test-key',
          handler: vi.fn().mockResolvedValue('result'),
        });

        expect(queue.isQueued('test')).toBe(true);
        expect(queue.isQueued('other')).toBe(false);

        vi.advanceTimersByTime(100);
        await vi.runAllTimersAsync();

        expect(queue.isQueued('test')).toBe(false);
      });
    });

    describe('subscribe', () => {
      it('returns an unsubscribe function', () => {
        const queue = createQueue();
        const listener = vi.fn();

        const unsubscribe = queue.subscribe(listener);

        expect(unsubscribe).toBeTypeOf('function');
      });

      it('notifies when task becomes pending', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        const listener = vi.fn();

        queue.subscribe(listener);

        const promise = queue.enqueue({
          name: 'test',
          key: 'test-key',
          handler: vi.fn().mockResolvedValue('result'),
        });

        await promise;

        // Called when pending (dispatch) and when settled
        expect(listener).toHaveBeenCalledTimes(2);
      });

      it('notifies with tasks map on dispatch and settlement', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        const listener = vi.fn();

        queue.subscribe(listener);

        let resolveHandler: () => void;
        const handlerPromise = new Promise<void>((resolve) => {
          resolveHandler = resolve;
        });

        const promise = queue.enqueue({
          name: 'test',
          key: 'test-key',
          handler: async () => {
            await handlerPromise;
            return 'result';
          },
        });

        // Wait for dispatch
        await new Promise(r => setTimeout(r, 10));

        // First call should have pending task (keyed by name 'test')
        expect(listener).toHaveBeenCalledTimes(1);
        const pendingSnapshot = listener.mock.calls[0]![0] as Record<string, { status: string }>;
        expect(Reflect.ownKeys(pendingSnapshot).length).toBe(1);
        expect(pendingSnapshot.test?.status).toBe('pending');

        // Complete the handler
        resolveHandler!();
        await promise;

        // Second call should have settled task (success)
        expect(listener).toHaveBeenCalledTimes(2);
        const settledSnapshot = listener.mock.calls[1]![0] as Record<string, { status: string }>;
        expect(Reflect.ownKeys(settledSnapshot).length).toBe(1);
        expect(settledSnapshot.test?.status).toBe('success');
      });

      it('unsubscribe stops notifications', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        const listener = vi.fn();

        const unsubscribe = queue.subscribe(listener);
        unsubscribe();

        await queue.enqueue({
          name: 'test',
          key: 'test-key',
          handler: vi.fn().mockResolvedValue('result'),
        });

        expect(listener).not.toHaveBeenCalled();
      });

      it('supports multiple subscribers', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        const listener1 = vi.fn();
        const listener2 = vi.fn();

        queue.subscribe(listener1);
        queue.subscribe(listener2);

        await queue.enqueue({
          name: 'test',
          key: 'test-key',
          handler: vi.fn().mockResolvedValue('result'),
        });

        expect(listener1).toHaveBeenCalledTimes(2);
        expect(listener2).toHaveBeenCalledTimes(2);
      });

      it('catches and logs listener errors', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const errorListener = vi.fn(() => {
          throw new Error('Listener error');
        });
        const successListener = vi.fn();

        queue.subscribe(errorListener);
        queue.subscribe(successListener);

        await queue.enqueue({
          name: 'test',
          key: 'test-key',
          handler: vi.fn().mockResolvedValue('result'),
        });

        // Both listeners were called despite error
        expect(errorListener).toHaveBeenCalled();
        expect(successListener).toHaveBeenCalled();

        // Error was logged
        expect(consoleSpy).toHaveBeenCalledWith('[vjs-queue]', expect.any(Error));

        consoleSpy.mockRestore();
      });

      it('provides strongly typed tasks object', async () => {
        vi.useRealTimers();

        // Use default queue - type safety is validated at compile time
        const queue = createQueue();

        queue.subscribe((tasks) => {
          // Tasks is a frozen object
          const task = tasks.playback;
          if (task) {
            expect(task.key).toBe('playback');
            expect(task.name).toBeDefined();
          }
        });

        await queue.enqueue({
          name: 'play',
          key: 'playback',
          handler: vi.fn().mockResolvedValue(undefined),
        });
      });
    });

    describe('task lifecycle', () => {
      it('task starts as pending and transitions to success', async () => {
        vi.useRealTimers();

        const queue = createQueue();

        const promise = queue.enqueue({
          name: 'task',
          key: 'k',
          handler: async () => {
            await new Promise(r => setTimeout(r, 10));
            return 'result';
          },
        });

        // Task should be pending (keyed by name 'task')
        await new Promise(r => setTimeout(r, 5));
        const pendingTask = queue.tasks.task;
        expect(pendingTask?.status).toBe('pending');
        expect(pendingTask?.name).toBe('task');

        // Wait for completion
        await promise;

        // Task should be success
        const successTask = queue.tasks.task;
        expect(successTask?.status).toBe('success');
        if (successTask?.status === 'success') {
          expect(successTask.output).toBe('result');
          expect(successTask.settledAt).toBeGreaterThan(successTask.startedAt);
        }
      });

      it('task starts as pending and transitions to error', async () => {
        vi.useRealTimers();

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

        // Task should be pending
        await new Promise(r => setTimeout(r, 5));
        expect(queue.tasks.task?.status).toBe('pending');

        // Wait for failure
        await expect(promise).rejects.toThrow('test error');

        // Task should be error
        const errorTask = queue.tasks.task;
        expect(errorTask?.status).toBe('error');
        if (errorTask?.status === 'error') {
          expect(errorTask.error).toBe(error);
          expect(errorTask.cancelled).toBe(false);
        }
      });

      it('aborted task has cancelled flag set to true', async () => {
        vi.useRealTimers();

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

        // Wait for task to start
        await new Promise(r => setTimeout(r, 10));
        expect(queue.tasks.task?.status).toBe('pending');

        // Abort the task (by name)
        queue.abort('task');
        await promise.catch(() => {});

        // Task should be error with cancelled=true
        const errorTask = queue.tasks.task;
        expect(errorTask?.status).toBe('error');
        if (errorTask?.status === 'error') {
          expect(errorTask.cancelled).toBe(true);
        }
      });

      it('new request replaces settled task', async () => {
        vi.useRealTimers();

        const queue = createQueue();

        // First request
        await queue.enqueue({
          name: 'first',
          key: 'k',
          handler: async () => 'first-result',
        });

        // Keyed by name 'first'
        expect(queue.tasks.first?.status).toBe('success');
        if (queue.tasks.first?.status === 'success') {
          expect(queue.tasks.first.output).toBe('first-result');
        }

        // Second request (different name, same key) - doesn't replace first since different name
        await queue.enqueue({
          name: 'second',
          key: 'k',
          handler: async () => 'second-result',
        });

        // Both tasks exist at different keys (names)
        expect(queue.tasks.second?.status).toBe('success');
        if (queue.tasks.second?.status === 'success') {
          expect(queue.tasks.second.output).toBe('second-result');
          expect(queue.tasks.second.name).toBe('second');
        }
      });
    });

    describe('reset', () => {
      it('clears settled task', async () => {
        vi.useRealTimers();

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
        vi.useRealTimers();

        const queue = createQueue();

        const promise = queue.enqueue({
          name: 'task',
          key: 'k',
          handler: async () => {
            await new Promise(r => setTimeout(r, 50));
            return 'result';
          },
        });

        // Wait for task to start
        await new Promise(r => setTimeout(r, 10));
        expect(queue.tasks.task?.status).toBe('pending');

        // Reset should be no-op
        queue.reset('task');
        expect(queue.tasks.task?.status).toBe('pending');

        await promise;
      });

      it('is no-op when task does not exist', () => {
        const queue = createQueue();

        // Should not throw
        queue.reset('nonexistent');

        expect(queue.tasks.nonexistent).toBeUndefined();
      });

      it('notifies subscribers when reset clears a task', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        const listener = vi.fn();

        await queue.enqueue({
          name: 'task',
          key: 'k',
          handler: async () => 'result',
        });

        queue.subscribe(listener);

        queue.reset('task');

        expect(listener).toHaveBeenCalledTimes(1);
        const snapshot = listener.mock.calls[0]![0] as Record<string, unknown>;
        expect(snapshot.task).toBeUndefined();
      });

      it('does not notify subscribers when task does not exist', () => {
        const queue = createQueue();
        const listener = vi.fn();

        queue.subscribe(listener);
        queue.reset('nonexistent');

        expect(listener).not.toHaveBeenCalled();
      });

      it('resets all settled tasks when no key provided', async () => {
        vi.useRealTimers();

        const queue = createQueue();

        // Create multiple settled tasks
        await queue.enqueue({ name: 'a', key: 'a', handler: async () => 'a-result' });
        await queue.enqueue({ name: 'b', key: 'b', handler: async () => 'b-result' });

        expect(queue.tasks.a?.status).toBe('success');
        expect(queue.tasks.b?.status).toBe('success');

        // Reset all
        queue.reset();

        expect(queue.tasks.a).toBeUndefined();
        expect(queue.tasks.b).toBeUndefined();
      });

      it('preserves pending tasks when resetting all', async () => {
        vi.useRealTimers();

        const queue = createQueue();

        // Create a settled task
        await queue.enqueue({ name: 'settled', key: 'settled', handler: async () => 'done' });

        // Create a pending task
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

        // Reset all - should only clear settled
        queue.reset();

        expect(queue.tasks.settled).toBeUndefined();
        expect(queue.tasks.pending?.status).toBe('pending');

        await pendingPromise;
      });
    });

    describe('isSettled', () => {
      it('returns true for success task', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        await queue.enqueue({ name: 'task', key: 'k', handler: async () => 'result' });

        expect(queue.isSettled('task')).toBe(true);
      });

      it('returns true for error task', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        const promise = queue.enqueue({
          name: 'task',
          key: 'k',
          handler: async () => {
            throw new Error('fail');
          },
        });

        await promise.catch(() => {});

        expect(queue.isSettled('task')).toBe(true);
      });

      it('returns false for pending task', async () => {
        vi.useRealTimers();

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

        expect(queue.isSettled('task')).toBe(false);

        await promise;
      });

      it('returns false for non-existent task', () => {
        const queue = createQueue();

        expect(queue.isSettled('nonexistent')).toBe(false);
      });
    });

    describe('destroy cleanup', () => {
      it('clears all task references on destroy', async () => {
        vi.useRealTimers();

        const queue = createQueue();

        await queue.enqueue({ name: 'task', key: 'k', handler: async () => 'result' });
        expect(queue.tasks.task?.status).toBe('success');

        queue.destroy();

        expect(Reflect.ownKeys(queue.tasks).length).toBe(0);
      });
    });

    describe('tasks getter', () => {
      it('returns frozen snapshot', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        await queue.enqueue({ name: 'task', key: 'k', handler: async () => 'result' });

        const tasks = queue.tasks;

        expect(Object.isFrozen(tasks)).toBe(true);
      });

      it('returns independent snapshots', async () => {
        vi.useRealTimers();

        const queue = createQueue();
        await queue.enqueue({ name: 'first', key: 'k', handler: async () => 'first' });

        const snapshot1 = queue.tasks;

        await queue.enqueue({ name: 'second', key: 'k', handler: async () => 'second' });

        const snapshot2 = queue.tasks;

        // Tasks keyed by name - first and second are different entries
        expect(snapshot1).not.toBe(snapshot2);
        if (snapshot1.first?.status === 'success' && snapshot2.second?.status === 'success') {
          expect(snapshot1.first.output).toBe('first');
          expect(snapshot2.second.output).toBe('second');
        }
      });
    });

    describe('symbol keys', () => {
      it('supports symbol names', async () => {
        vi.useRealTimers();

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
        vi.useRealTimers();

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
});
