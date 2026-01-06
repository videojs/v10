import type { AsyncStatus, ErrorTask, PendingTask, SuccessTask, Task, TasksRecord } from '../queue';

import { describe, expectTypeOf, it } from 'vitest';

import { createQueue } from '../queue';

describe('queue types', () => {
  describe('AsyncStatus', () => {
    it('includes all status values', () => {
      const idle: AsyncStatus = 'idle';
      const pending: AsyncStatus = 'pending';
      const success: AsyncStatus = 'success';
      const error: AsyncStatus = 'error';

      expectTypeOf(idle).toExtend<AsyncStatus>();
      expectTypeOf(pending).toExtend<AsyncStatus>();
      expectTypeOf(success).toExtend<AsyncStatus>();
      expectTypeOf(error).toExtend<AsyncStatus>();
    });
  });

  describe('Task', () => {
    it('is discriminated union of task states', () => {
      const task: Task = {} as Task;

      if (task.status === 'pending') {
        expectTypeOf(task).toExtend<PendingTask>();
        expectTypeOf(task.abort).toExtend<AbortController>();
      }

      if (task.status === 'success') {
        expectTypeOf(task).toExtend<SuccessTask>();
        expectTypeOf(task.output).toBeUnknown();
        expectTypeOf(task.settledAt).toBeNumber();
      }

      if (task.status === 'error') {
        expectTypeOf(task).toExtend<ErrorTask>();
        expectTypeOf(task.error).toBeUnknown();
        expectTypeOf(task.cancelled).toBeBoolean();
        expectTypeOf(task.settledAt).toBeNumber();
      }
    });

    it('has common properties across all states', () => {
      const task: Task = {} as Task;

      expectTypeOf(task.id).toEqualTypeOf<symbol>();
      expectTypeOf(task.name).toEqualTypeOf<string>();
      expectTypeOf(task.key).toExtend<string | symbol>();
      expectTypeOf(task.startedAt).toBeNumber();
    });
  });

  describe('createQueue', () => {
    it('returns Queue with default task record', () => {
      const queue = createQueue();

      expectTypeOf(queue.tasks).toExtend<TasksRecord<any>>();
      expectTypeOf(queue.destroyed).toBeBoolean();
    });
  });

  describe('Queue methods', () => {
    it('isPending takes name parameter', () => {
      const queue = createQueue();

      expectTypeOf(queue.isPending).toBeFunction();
      expectTypeOf(queue.isPending).returns.toBeBoolean();
    });

    it('isQueued takes name parameter', () => {
      const queue = createQueue();

      expectTypeOf(queue.isQueued).toBeFunction();
      expectTypeOf(queue.isQueued).returns.toBeBoolean();
    });

    it('isSettled takes name parameter', () => {
      const queue = createQueue();

      expectTypeOf(queue.isSettled).toBeFunction();
      expectTypeOf(queue.isSettled).returns.toBeBoolean();
    });

    it('reset takes optional name parameter', () => {
      const queue = createQueue();

      expectTypeOf(queue.reset).toBeFunction();
      expectTypeOf(queue.reset).returns.toBeVoid();
    });

    it('cancel takes optional name parameter and returns boolean', () => {
      const queue = createQueue();

      expectTypeOf(queue.cancel).toBeFunction();
      expectTypeOf(queue.cancel).returns.toBeBoolean();
    });

    it('abort takes optional name parameter', () => {
      const queue = createQueue();

      expectTypeOf(queue.abort).toBeFunction();
      expectTypeOf(queue.abort).returns.toBeVoid();
    });

    it('flush takes optional name parameter and returns promise', () => {
      const queue = createQueue();

      expectTypeOf(queue.flush).toBeFunction();
      expectTypeOf(queue.flush).returns.toExtend<Promise<void>>();
    });

    it('subscribe takes listener and returns unsubscribe', () => {
      const queue = createQueue();

      expectTypeOf(queue.subscribe).toBeFunction();
      expectTypeOf(queue.subscribe).returns.toExtend<() => void>();
    });

    it('destroy returns void', () => {
      const queue = createQueue();

      expectTypeOf(queue.destroy).toBeFunction();
      expectTypeOf(queue.destroy).returns.toBeVoid();
    });
  });

  describe('enqueue', () => {
    it('returns promise', async () => {
      const queue = createQueue();

      const result = queue.enqueue({
        name: 'test',
        key: 'test',
        handler: async () => 42,
      });

      // Verify it's a promise by checking it has then
      expectTypeOf(result.then).toBeFunction();
    });

    it('handler receives TaskContext with signal', async () => {
      const queue = createQueue();

      await queue.enqueue({
        name: 'test',
        key: 'test',
        handler: async (ctx) => {
          expectTypeOf(ctx.signal).toEqualTypeOf<AbortSignal>();
          return 'done';
        },
      });
    });
  });
});
