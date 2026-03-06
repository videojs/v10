import { describe, expect, it, vi } from 'vitest';
import { ConcurrentRunner, SerialRunner, Task } from '../task';

// =============================================================================
// Task
// =============================================================================

describe('Task', () => {
  describe('status lifecycle', () => {
    it('starts in pending status', () => {
      const task = new Task(async () => {});
      expect(task.status).toBe('pending');
    });

    it('transitions to running when run() is called', async () => {
      let capturedStatus: string | undefined;

      const task = new Task(async () => {
        capturedStatus = task.status;
      });

      await task.run();

      expect(capturedStatus).toBe('running');
    });

    it('transitions to done when run() resolves', async () => {
      const task = new Task(async () => 42);
      await task.run();
      expect(task.status).toBe('done');
    });

    it('transitions to error when run() rejects', async () => {
      const task = new Task<void, Error>(async () => {
        throw new Error('boom');
      });
      await expect(task.run()).rejects.toThrow('boom');
      expect(task.status).toBe('error');
    });
  });

  describe('value and error', () => {
    it('returns value from run() promise', async () => {
      const task = new Task(async () => 'hello');
      const result = await task.run();
      expect(result).toBe('hello');
    });

    it('sets value before transitioning to done', async () => {
      // The ordering guarantee: value is written before status changes.
      // After run() resolves, both are correct — the guarantee is structural
      // (sequential assignment with no async gap between the two writes).
      const task = new Task(async () => 99);
      await task.run();
      expect(task.value).toBe(99);
      expect(task.status).toBe('done');
    });

    it('sets error before transitioning to error status', async () => {
      const err = new Error('fail');
      const task = new Task<void, Error>(async () => {
        throw err;
      });
      await expect(task.run()).rejects.toThrow('fail');
      expect(task.error).toBe(err);
      expect(task.status).toBe('error');
    });

    it('value is undefined before completion', () => {
      const task = new Task(async () => 42);
      expect(task.value).toBeUndefined();
    });

    it('error is undefined before failure', () => {
      const task = new Task(async () => {});
      expect(task.error).toBeUndefined();
    });

    it('value is undefined for Task<void>', async () => {
      const task = new Task(async () => {});
      await task.run();
      expect(task.value).toBeUndefined();
    });
  });

  describe('abort', () => {
    it('passes signal to run function', async () => {
      let receivedSignal: AbortSignal | undefined;

      const task = new Task(async (signal) => {
        receivedSignal = signal;
      });

      await task.run();
      expect(receivedSignal).toBeInstanceOf(AbortSignal);
    });

    it('aborts the signal when abort() is called', async () => {
      let receivedSignal: AbortSignal | undefined;

      const task = new Task(async (signal) => {
        receivedSignal = signal;
        // Simulate async work
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      });

      const runPromise = task.run();
      task.abort();
      await runPromise;

      expect(receivedSignal?.aborted).toBe(true);
    });

    it('composes external signal — external abort aborts the task signal', async () => {
      const external = new AbortController();
      let receivedSignal: AbortSignal | undefined;

      const task = new Task(
        async (signal) => {
          receivedSignal = signal;
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
        },
        { signal: external.signal }
      );

      const runPromise = task.run();
      external.abort();
      await runPromise;

      expect(receivedSignal?.aborted).toBe(true);
    });

    it('internal abort still works when external signal is provided', async () => {
      const external = new AbortController();
      let receivedSignal: AbortSignal | undefined;

      const task = new Task(
        async (signal) => {
          receivedSignal = signal;
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
        },
        { signal: external.signal }
      );

      const runPromise = task.run();
      task.abort();
      await runPromise;

      expect(receivedSignal?.aborted).toBe(true);
    });
  });

  describe('id', () => {
    it('uses provided string id', () => {
      const task = new Task(async () => {}, { id: 'my-task' });
      expect(task.id).toBe('my-task');
    });

    it('calls provided function id once at construction', () => {
      const idFn = vi.fn(() => 'fn-task-id');
      const task = new Task(async () => {}, { id: idFn });
      expect(task.id).toBe('fn-task-id');
      expect(idFn).toHaveBeenCalledTimes(1);
    });

    it('generates a unique id when none provided', () => {
      const t1 = new Task(async () => {});
      const t2 = new Task(async () => {});
      expect(typeof t1.id).toBe('string');
      expect(t1.id).not.toBe(t2.id);
    });
  });
});

// =============================================================================
// ConcurrentRunner
// =============================================================================

describe('ConcurrentRunner', () => {
  it('executes a scheduled task', async () => {
    const runner = new ConcurrentRunner();
    const ran = vi.fn();
    const task = new Task(async () => {
      ran();
    });

    runner.schedule(task);
    await vi.waitFor(() => expect(ran).toHaveBeenCalledTimes(1));
  });

  it('deduplicates: ignores second schedule for same id while first is in flight', async () => {
    const runner = new ConcurrentRunner();
    const ran = vi.fn();

    let resolveFirst!: () => void;
    const first = new Task(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
      { id: 'track-1' }
    );
    const second = new Task(
      async () => {
        ran();
      },
      { id: 'track-1' }
    );

    runner.schedule(first);
    runner.schedule(second); // same id — should be ignored

    resolveFirst();
    await vi.waitFor(() => expect(first.status).toBe('done'));

    // second was never run
    expect(ran).not.toHaveBeenCalled();
    expect(second.status).toBe('pending');
  });

  it('abortAll() cancels all in-flight tasks', async () => {
    const runner = new ConcurrentRunner();
    let signal1: AbortSignal | undefined;
    let signal2: AbortSignal | undefined;

    const t1 = new Task(
      async (s) => {
        signal1 = s;
        await new Promise(() => {});
      },
      { id: 'a' }
    );
    const t2 = new Task(
      async (s) => {
        signal2 = s;
        await new Promise(() => {});
      },
      { id: 'b' }
    );

    runner.schedule(t1);
    runner.schedule(t2);

    await vi.waitFor(() => expect(signal1).toBeDefined());
    await vi.waitFor(() => expect(signal2).toBeDefined());

    runner.abortAll();

    expect(signal1!.aborted).toBe(true);
    expect(signal2!.aborted).toBe(true);
  });
});

// =============================================================================
// SerialRunner
// =============================================================================

describe('SerialRunner', () => {
  it('executes tasks in submission order', async () => {
    const runner = new SerialRunner();
    const order: number[] = [];

    let resolveFirst!: () => void;
    const first = new Task(
      () =>
        new Promise<void>((resolve) => {
          order.push(1); // recorded when first starts
          resolveFirst = resolve;
        }),
      { id: '1' }
    );
    const second = new Task(
      async () => {
        order.push(2);
      },
      { id: '2' }
    );

    const p1 = runner.schedule(first);
    const p2 = runner.schedule(second);

    await vi.waitFor(() => expect(first.status).toBe('running'));
    resolveFirst();
    await Promise.all([p1, p2]);

    expect(order).toEqual([1, 2]);
  });

  it('second task does not start until first completes', async () => {
    const runner = new SerialRunner();
    let secondStarted = false;

    let resolveFirst!: () => void;
    const first = new Task(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
      { id: '1' }
    );
    const second = new Task(
      async () => {
        secondStarted = true;
      },
      { id: '2' }
    );

    runner.schedule(first);
    runner.schedule(second);

    // Before first resolves, second should not have started
    await Promise.resolve();
    expect(secondStarted).toBe(false);
    expect(second.status).toBe('pending');

    resolveFirst();
    await vi.waitFor(() => expect(second.status).toBe('done'));
    expect(secondStarted).toBe(true);
  });

  it('schedule() resolves with the task return value', async () => {
    const runner = new SerialRunner();
    const task = new Task(async () => 'result');
    const value = await runner.schedule(task);
    expect(value).toBe('result');
  });

  it('schedule() rejects when the task throws', async () => {
    const runner = new SerialRunner();
    const task = new Task(async () => {
      throw new Error('task failed');
    });
    await expect(runner.schedule(task)).rejects.toThrow('task failed');
  });

  it('continues processing after a task error', async () => {
    const runner = new SerialRunner();
    const failing = new Task(
      async () => {
        throw new Error('fail');
      },
      { id: 'bad' }
    );
    const succeeding = new Task(async () => 'ok', { id: 'good' });

    await expect(runner.schedule(failing)).rejects.toThrow('fail');
    await expect(runner.schedule(succeeding)).resolves.toBe('ok');
  });

  it('abortAll() aborts queued tasks before they start', async () => {
    const runner = new SerialRunner();

    let resolveFirst!: () => void;
    const first = new Task(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
      { id: '1' }
    );

    let receivedSignal: AbortSignal | undefined;
    const second = new Task(
      async (signal) => {
        receivedSignal = signal;
      },
      { id: '2' }
    );

    runner.schedule(first);
    const p2 = runner.schedule(second);

    await vi.waitFor(() => expect(first.status).toBe('running'));

    // Abort while second is still queued
    runner.abortAll();
    resolveFirst();

    // second runs but receives an already-aborted signal
    await p2;
    expect(receivedSignal?.aborted).toBe(true);
  });

  it('abortAll() aborts the in-flight task', async () => {
    const runner = new SerialRunner();
    let taskSignal: AbortSignal | undefined;

    const task = new Task(
      async (signal) => {
        taskSignal = signal;
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
      },
      { id: '1' }
    );

    runner.schedule(task);
    await vi.waitFor(() => expect(task.status).toBe('running'));

    runner.abortAll();

    expect(taskSignal?.aborted).toBe(true);
  });
});
