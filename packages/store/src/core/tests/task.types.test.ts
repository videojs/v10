import type { ErrorTask, PendingTask, SuccessTask, Task } from '../task';

import { describe, expectTypeOf, it } from 'vitest';

import { isErrorTask, isPendingTask, isSettledTask, isSuccessTask } from '../task';

describe('task types', () => {
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

  describe('type guards', () => {
    it('isPendingTask narrows to PendingTask', () => {
      const task: Task = {} as Task;

      if (isPendingTask(task)) {
        expectTypeOf(task).toExtend<PendingTask>();
      }
    });

    it('isSettledTask narrows to SuccessTask | ErrorTask', () => {
      const task: Task = {} as Task;

      if (isSettledTask(task)) {
        expectTypeOf(task.settledAt).toBeNumber();
      }
    });

    it('isSuccessTask narrows to SuccessTask', () => {
      const task: Task = {} as Task;

      if (isSuccessTask(task)) {
        expectTypeOf(task).toExtend<SuccessTask>();
        expectTypeOf(task.output).toBeUnknown();
      }
    });

    it('isErrorTask narrows to ErrorTask', () => {
      const task: Task = {} as Task;

      if (isErrorTask(task)) {
        expectTypeOf(task).toExtend<ErrorTask>();
        expectTypeOf(task.error).toBeUnknown();
      }
    });
  });
});
