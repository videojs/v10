import { describe, expect, it, vi } from 'vitest';
import { createReactor } from '../create-reactor';
import { signal } from '../signals/primitives';

// One microtask tick — enough for the signal-polyfill watcher to flush pending effects.
const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

// =============================================================================
// createReactor — core behavior
// =============================================================================

describe('createReactor', () => {
  it('starts with the initial status and context', () => {
    const reactor = createReactor({
      initial: 'idle' as const,
      context: { value: 0 },
      states: { idle: {} },
    });

    expect(reactor.snapshot.get().status).toBe('idle');
    expect(reactor.snapshot.get().context).toEqual({ value: 0 });

    reactor.destroy();
  });

  it('runs the entry effect for the initial state on creation', () => {
    const fn = vi.fn();
    createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: { entry: [fn] } },
    }).destroy();

    expect(fn).toHaveBeenCalledOnce();
  });

  it('runs the reaction effect for the initial state on creation', () => {
    const fn = vi.fn();
    createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: { reactions: [fn] } },
    }).destroy();

    expect(fn).toHaveBeenCalledOnce();
  });

  it('does not run effects for states other than the initial state', () => {
    const otherFn = vi.fn();
    createReactor<'idle' | 'other', object>({
      initial: 'idle',
      context: {},
      states: {
        idle: {},
        other: { entry: [otherFn] },
      },
    }).destroy();

    expect(otherFn).not.toHaveBeenCalled();
  });

  it('passes transition, context, and setContext to entry effect fns', () => {
    let captured: unknown;
    createReactor({
      initial: 'idle' as const,
      context: { x: 1 },
      states: {
        idle: {
          entry: [
            (ctx) => {
              captured = ctx;
            },
          ],
        },
      },
    }).destroy();

    expect(typeof (captured as { transition: unknown }).transition).toBe('function');
    expect((captured as { context: unknown }).context).toEqual({ x: 1 });
    expect(typeof (captured as { setContext: unknown }).setContext).toBe('function');
  });

  it('transitions status via transition() in a reaction', async () => {
    const src = signal(false);
    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      states: {
        waiting: {
          reactions: [
            ({ transition }) => {
              if (src.get()) transition('active');
            },
          ],
        },
        active: {},
      },
    });

    expect(reactor.snapshot.get().status).toBe('waiting');

    src.set(true);
    await tick();

    expect(reactor.snapshot.get().status).toBe('active');

    reactor.destroy();
  });

  it('activates the correct effects after transition', async () => {
    const src = signal(false);
    const activeFn = vi.fn();

    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      states: {
        waiting: {
          reactions: [
            ({ transition }) => {
              if (src.get()) transition('active');
            },
          ],
        },
        active: { entry: [activeFn] },
      },
    });

    expect(activeFn).not.toHaveBeenCalled();

    src.set(true);
    await tick();
    await tick(); // second tick: effects for 'active' now run

    expect(activeFn).toHaveBeenCalledOnce();

    reactor.destroy();
  });

  it('updates context via setContext()', () => {
    let captured = 0;
    const reactor = createReactor({
      initial: 'idle' as const,
      context: { count: 0 },
      states: {
        idle: {
          entry: [
            ({ context, setContext }) => {
              captured = context.count;
              setContext({ count: context.count + 1 });
            },
          ],
        },
      },
    });

    // Effect ran on creation with count: 0, then setContext wrote count: 1
    expect(captured).toBe(0);
    expect(reactor.snapshot.get().context.count).toBe(1);

    reactor.destroy();
  });

  it('multiple entry effects in the same state run independently', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();

    createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: { entry: [fn1, fn2, fn3] } },
    }).destroy();

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
    expect(fn3).toHaveBeenCalledOnce();
  });

  it('re-runs only the reaction whose dependency changed', async () => {
    const src1 = signal(0);
    const src2 = signal(0);
    const fn1 = vi.fn(() => {
      src1.get();
    });
    const fn2 = vi.fn(() => {
      src2.get();
    });

    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: { reactions: [fn1, fn2] } },
    });

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();

    src1.set(1);
    await tick();

    expect(fn1).toHaveBeenCalledTimes(2);
    expect(fn2).toHaveBeenCalledOnce(); // not re-run — no dependency on src1

    reactor.destroy();
  });

  it('entry effect does not re-run when a signal read inside it changes', async () => {
    const src = signal(0);
    const fn = vi.fn(() => {
      src.get(); // read inside entry — should NOT create a reactive dep
    });

    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: { entry: [fn] } },
    });

    expect(fn).toHaveBeenCalledOnce();

    src.set(1);
    await tick();

    expect(fn).toHaveBeenCalledOnce(); // NOT re-run

    reactor.destroy();
  });

  it('snapshot is reactive', async () => {
    const src = signal(false);
    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      states: {
        waiting: {
          reactions: [
            ({ transition }) => {
              if (src.get()) transition('active');
            },
          ],
        },
        active: {},
      },
    });

    const before = reactor.snapshot.get();
    src.set(true);
    await tick();
    const after = reactor.snapshot.get();

    expect(before.status).toBe('waiting');
    expect(after.status).toBe('active');

    reactor.destroy();
  });
});

// =============================================================================
// createReactor — cleanup
// =============================================================================

describe('createReactor — cleanup', () => {
  it('calls the entry effect cleanup on state exit', async () => {
    const src = signal(false);
    const cleanup = vi.fn();

    const reactor = createReactor<'active' | 'done', object>({
      initial: 'active',
      context: {},
      states: {
        active: {
          // entry: cleanup fires on exit regardless of whether fn is tracked
          entry: [
            () => {
              return cleanup;
            },
          ],
          reactions: [
            ({ transition }) => {
              if (src.get()) transition('done');
            },
          ],
        },
        done: {},
      },
    });

    expect(cleanup).not.toHaveBeenCalled();

    src.set(true);
    await tick();

    expect(cleanup).toHaveBeenCalledOnce();

    reactor.destroy();
  });

  it('calls the reaction cleanup before re-running when a dependency changes', async () => {
    const src = signal(0);
    const cleanup = vi.fn();

    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: {
        idle: {
          reactions: [
            () => {
              src.get();
              return cleanup;
            },
          ],
        },
      },
    });

    expect(cleanup).not.toHaveBeenCalled();

    src.set(1);
    await tick();

    expect(cleanup).toHaveBeenCalledOnce();

    reactor.destroy();
  });

  it('calls effect cleanups on destroy()', () => {
    const entryCleanup = vi.fn();
    const reactionCleanup = vi.fn();

    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: {
        idle: {
          entry: [() => entryCleanup],
          reactions: [() => reactionCleanup],
        },
      },
    });

    reactor.destroy();

    expect(entryCleanup).toHaveBeenCalledOnce();
    expect(reactionCleanup).toHaveBeenCalledOnce();
  });

  it('does not call cleanup for inactive state effects on destroy()', () => {
    const activeCleanup = vi.fn();
    const inactiveCleanup = vi.fn();

    createReactor<'idle' | 'other', object>({
      initial: 'idle',
      context: {},
      states: {
        idle: { entry: [() => activeCleanup] },
        other: { entry: [() => inactiveCleanup] },
      },
    }).destroy();

    expect(activeCleanup).toHaveBeenCalledOnce();
    expect(inactiveCleanup).not.toHaveBeenCalled();
  });
});

// =============================================================================
// createReactor — derive
// =============================================================================

describe('createReactor — derive', () => {
  it('transitions to the status returned by the derive fn', async () => {
    const src = signal<'waiting' | 'active'>('waiting');
    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      derive: () => src.get(),
      states: { waiting: {}, active: {} },
    });

    expect(reactor.snapshot.get().status).toBe('waiting');

    src.set('active');
    await tick();

    expect(reactor.snapshot.get().status).toBe('active');

    reactor.destroy();
  });

  it('does not transition when the derive fn returns the current status', async () => {
    const activeFn = vi.fn();
    const reactor = createReactor<'idle' | 'active', object>({
      initial: 'idle',
      context: {},
      derive: () => 'idle',
      states: { idle: {}, active: { entry: activeFn } },
    });

    await tick();

    expect(reactor.snapshot.get().status).toBe('idle');
    expect(activeFn).not.toHaveBeenCalled();

    reactor.destroy();
  });

  it('re-runs when reactive dependencies change', async () => {
    const src = signal<'waiting' | 'active'>('waiting');
    const deriveFn = vi.fn(() => src.get());

    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      derive: deriveFn,
      states: { waiting: {}, active: {} },
    });

    expect(deriveFn).toHaveBeenCalledOnce();

    src.set('active');
    await tick();

    expect(deriveFn).toHaveBeenCalledTimes(2);

    reactor.destroy();
  });

  it('does not run during destroying or destroyed', async () => {
    const deriveFn = vi.fn(() => 'idle' as const);
    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      derive: deriveFn,
      states: { idle: {} },
    });

    deriveFn.mockClear();
    reactor.destroy();
    await tick();

    expect(deriveFn).not.toHaveBeenCalled();
  });

  it('runs before per-state effects so its transitions take effect first', async () => {
    const src = signal<'waiting' | 'active'>('waiting');
    const order: string[] = [];

    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      derive: () => {
        order.push('derive');
        return src.get();
      },
      states: {
        waiting: {
          entry: () => {
            order.push('waiting-entry');
          },
        },
        active: {
          entry: () => {
            order.push('active-entry');
          },
        },
      },
    });

    order.length = 0;
    src.set('active');
    await tick();
    await tick();

    expect(order[0]).toBe('derive');
    expect(order).toContain('active-entry');
    expect(order).not.toContain('waiting-entry');

    reactor.destroy();
  });
});

// =============================================================================
// createReactor — destroy
// =============================================================================

describe('createReactor — destroy', () => {
  it('transitions to destroyed on destroy()', () => {
    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: {} },
    });

    reactor.destroy();

    expect(reactor.snapshot.get().status).toBe('destroyed');
  });

  it('destroy() is idempotent', () => {
    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: {} },
    });

    reactor.destroy();
    expect(() => reactor.destroy()).not.toThrow();
    expect(reactor.snapshot.get().status).toBe('destroyed');
  });

  it('does not run reactions after destroy()', async () => {
    const src = signal(0);
    const fn = vi.fn(() => {
      src.get();
    });

    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: { reactions: [fn] } },
    });

    reactor.destroy();
    fn.mockClear();

    src.set(1);
    await tick();

    expect(fn).not.toHaveBeenCalled();
  });
});
