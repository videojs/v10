import { describe, expectTypeOf, it } from 'vitest';
import { createQueue } from '../queue';

describe('queue types', () => {
  describe('createQueue', () => {
    it('returns Queue with tasks getter and subscribe method', () => {
      const queue = createQueue();

      expectTypeOf(queue.tasks).toBeObject();
      expectTypeOf(queue.subscribe).toBeFunction();
      expectTypeOf(queue.destroyed).toBeBoolean();
    });
  });

  describe('Queue methods', () => {
    it('reset takes optional name parameter', () => {
      const queue = createQueue();

      expectTypeOf(queue.reset).toBeFunction();
      expectTypeOf(queue.reset).returns.toBeVoid();
    });

    it('abort takes optional name parameter', () => {
      const queue = createQueue();

      expectTypeOf(queue.abort).toBeFunction();
      expectTypeOf(queue.abort).returns.toBeVoid();
    });

    it('tasks is reactive', () => {
      const queue = createQueue();

      expectTypeOf(queue.tasks).toBeObject();
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
