import { describe, expect, it } from 'vitest';
import type { ErrorTask, PendingTask, SuccessTask, Task } from '../task';

import { isErrorTask, isPendingTask, isSettledTask, isSuccessTask } from '../task';

describe('task', () => {
  describe('isPendingTask', () => {
    it('returns true for pending task', () => {
      const task: Task = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'pending',
        abort: new AbortController(),
      };

      expect(isPendingTask(task)).toBe(true);
    });

    it('returns false for success task', () => {
      const task: Task = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'success',
        settledAt: Date.now(),
        output: 'result',
      };

      expect(isPendingTask(task)).toBe(false);
    });

    it('returns false for error task', () => {
      const task: Task = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'error',
        settledAt: Date.now(),
        error: new Error('test'),
        cancelled: false,
      };

      expect(isPendingTask(task)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isPendingTask(undefined)).toBe(false);
    });
  });

  describe('isSettledTask', () => {
    it('returns true for success task', () => {
      const task: Task = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'success',
        settledAt: Date.now(),
        output: 'result',
      };

      expect(isSettledTask(task)).toBe(true);
    });

    it('returns true for error task', () => {
      const task: Task = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'error',
        settledAt: Date.now(),
        error: new Error('test'),
        cancelled: false,
      };

      expect(isSettledTask(task)).toBe(true);
    });

    it('returns false for pending task', () => {
      const task: Task = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'pending',
        abort: new AbortController(),
      };

      expect(isSettledTask(task)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSettledTask(undefined)).toBe(false);
    });
  });

  describe('isSuccessTask', () => {
    it('returns true for success task', () => {
      const task: SuccessTask = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'success',
        settledAt: Date.now(),
        output: 'result',
      };

      expect(isSuccessTask(task)).toBe(true);
    });

    it('returns false for error task', () => {
      const task: ErrorTask = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'error',
        settledAt: Date.now(),
        error: new Error('test'),
        cancelled: false,
      };

      expect(isSuccessTask(task)).toBe(false);
    });

    it('returns false for pending task', () => {
      const task: PendingTask = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'pending',
        abort: new AbortController(),
      };

      expect(isSuccessTask(task)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSuccessTask(undefined)).toBe(false);
    });
  });

  describe('isErrorTask', () => {
    it('returns true for error task', () => {
      const task: ErrorTask = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'error',
        settledAt: Date.now(),
        error: new Error('test'),
        cancelled: false,
      };

      expect(isErrorTask(task)).toBe(true);
    });

    it('returns true for cancelled error task', () => {
      const task: ErrorTask = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'error',
        settledAt: Date.now(),
        error: new Error('aborted'),
        cancelled: true,
      };

      expect(isErrorTask(task)).toBe(true);
    });

    it('returns false for success task', () => {
      const task: SuccessTask = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'success',
        settledAt: Date.now(),
        output: 'result',
      };

      expect(isErrorTask(task)).toBe(false);
    });

    it('returns false for pending task', () => {
      const task: PendingTask = {
        id: Symbol('task'),
        name: 'test',
        key: 'test',
        input: undefined,
        startedAt: Date.now(),
        meta: null,
        status: 'pending',
        abort: new AbortController(),
      };

      expect(isErrorTask(task)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isErrorTask(undefined)).toBe(false);
    });
  });
});
