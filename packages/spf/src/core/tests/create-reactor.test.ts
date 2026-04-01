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
      states: { idle: [] },
    });

    expect(reactor.snapshot.get().status).toBe('idle');
    expect(reactor.snapshot.get().context).toEqual({ value: 0 });

    reactor.destroy();
  });

  it('runs the effect for the initial state on creation', () => {
    const fn = vi.fn();
    createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: [fn] },
    }).destroy();

    expect(fn).toHaveBeenCalledOnce();
  });

  it('does not run effects for states other than the initial state', () => {
    const otherFn = vi.fn();
    createReactor<'idle' | 'other', object>({
      initial: 'idle',
      context: {},
      states: {
        idle: [],
        other: [otherFn],
      },
    }).destroy();

    expect(otherFn).not.toHaveBeenCalled();
  });

  it('passes transition, context, and setContext to effect fns', () => {
    let captured: unknown;
    createReactor({
      initial: 'idle' as const,
      context: { x: 1 },
      states: {
        idle: [
          (ctx) => {
            captured = ctx;
          },
        ],
      },
    }).destroy();

    expect(typeof (captured as { transition: unknown }).transition).toBe('function');
    expect((captured as { context: unknown }).context).toEqual({ x: 1 });
    expect(typeof (captured as { setContext: unknown }).setContext).toBe('function');
  });

  it('transitions status via transition()', async () => {
    const src = signal(false);
    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      states: {
        waiting: [
          ({ transition }) => {
            if (src.get()) transition('active');
          },
        ],
        active: [],
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
        waiting: [
          ({ transition }) => {
            if (src.get()) transition('active');
          },
        ],
        active: [activeFn],
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
        idle: [
          ({ context, setContext }) => {
            captured = context.count;
            setContext({ count: context.count + 1 });
          },
        ],
      },
    });

    // Effect ran on creation with count: 0, then setContext wrote count: 1
    expect(captured).toBe(0);
    expect(reactor.snapshot.get().context.count).toBe(1);

    reactor.destroy();
  });

  it('multiple effects in the same state run independently', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();

    createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: [fn1, fn2, fn3] },
    }).destroy();

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
    expect(fn3).toHaveBeenCalledOnce();
  });

  it('re-runs only the effect whose dependency changed', async () => {
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
      states: { idle: [fn1, fn2] },
    });

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();

    src1.set(1);
    await tick();

    expect(fn1).toHaveBeenCalledTimes(2);
    expect(fn2).toHaveBeenCalledOnce(); // not re-run — no dependency on src1

    reactor.destroy();
  });

  it('snapshot is reactive', async () => {
    const src = signal(false);
    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      states: {
        waiting: [
          ({ transition }) => {
            if (src.get()) transition('active');
          },
        ],
        active: [],
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
  it('calls the effect cleanup on state exit', async () => {
    const src = signal(false);
    const cleanup = vi.fn();

    const reactor = createReactor<'active' | 'done', object>({
      initial: 'active',
      context: {},
      states: {
        active: [
          ({ transition }) => {
            if (src.get()) transition('done');
            return cleanup;
          },
        ],
        done: [],
      },
    });

    expect(cleanup).not.toHaveBeenCalled();

    src.set(true);
    await tick();

    expect(cleanup).toHaveBeenCalledOnce();

    reactor.destroy();
  });

  it('calls the effect cleanup before re-running when a dependency changes', async () => {
    const src = signal(0);
    const cleanup = vi.fn();

    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: {
        idle: [
          () => {
            src.get();
            return cleanup;
          },
        ],
      },
    });

    expect(cleanup).not.toHaveBeenCalled();

    src.set(1);
    await tick();

    expect(cleanup).toHaveBeenCalledOnce();

    reactor.destroy();
  });

  it('calls effect cleanups on destroy()', () => {
    const cleanup = vi.fn();

    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: {
        idle: [() => cleanup],
      },
    });

    reactor.destroy();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('does not call cleanup for inactive state effects on destroy()', () => {
    const activeCleanup = vi.fn();
    const inactiveCleanup = vi.fn();

    createReactor<'idle' | 'other', object>({
      initial: 'idle',
      context: {},
      states: {
        idle: [() => activeCleanup],
        other: [() => inactiveCleanup],
      },
    }).destroy();

    expect(activeCleanup).toHaveBeenCalledOnce();
    expect(inactiveCleanup).not.toHaveBeenCalled();
  });
});

// =============================================================================
// createReactor — always
// =============================================================================

describe('createReactor — always', () => {
  it('runs in the initial state', () => {
    const fn = vi.fn();
    createReactor({
      initial: 'idle' as const,
      context: {},
      always: [fn],
      states: { idle: [] },
    }).destroy();

    expect(fn).toHaveBeenCalledOnce();
  });

  it('receives the current status in ctx', () => {
    let capturedStatus: string | undefined;
    createReactor({
      initial: 'idle' as const,
      context: {},
      always: [
        ({ status }) => {
          capturedStatus = status;
        },
      ],
      states: { idle: [] },
    }).destroy();

    expect(capturedStatus).toBe('idle');
  });

  it('re-runs on status change and receives the new status', async () => {
    const src = signal(false);
    const statuses: string[] = [];

    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      always: [
        ({ status }) => {
          statuses.push(status);
        },
      ],
      states: {
        waiting: [
          ({ transition }) => {
            if (src.get()) transition('active');
          },
        ],
        active: [],
      },
    });

    expect(statuses).toEqual(['waiting']);

    src.set(true);
    await tick();
    await tick();

    expect(statuses).toEqual(['waiting', 'active']);

    reactor.destroy();
  });

  it('can trigger transitions', async () => {
    const src = signal(false);

    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      always: [
        ({ status, transition }) => {
          if (src.get() && status === 'waiting') transition('active');
        },
      ],
      states: { waiting: [], active: [] },
    });

    expect(reactor.snapshot.get().status).toBe('waiting');

    src.set(true);
    await tick();

    expect(reactor.snapshot.get().status).toBe('active');

    reactor.destroy();
  });

  it('cleanup runs before each re-run', async () => {
    const src = signal(false);
    const cleanup = vi.fn();

    const reactor = createReactor<'waiting' | 'active', object>({
      initial: 'waiting',
      context: {},
      always: [() => cleanup],
      states: {
        waiting: [
          ({ transition }) => {
            if (src.get()) transition('active');
          },
        ],
        active: [],
      },
    });

    expect(cleanup).not.toHaveBeenCalled();

    src.set(true);
    await tick();

    expect(cleanup).toHaveBeenCalledOnce();

    reactor.destroy();
  });

  it('does not run during destroying or destroyed', async () => {
    const fn = vi.fn();
    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      always: [fn],
      states: { idle: [] },
    });

    fn.mockClear();
    reactor.destroy();
    await tick();

    expect(fn).not.toHaveBeenCalled();
  });

  it('runs alongside per-state effects in the same state', () => {
    const alwaysFn = vi.fn();
    const stateFn = vi.fn();

    createReactor({
      initial: 'idle' as const,
      context: {},
      always: [alwaysFn],
      states: { idle: [stateFn] },
    }).destroy();

    expect(alwaysFn).toHaveBeenCalledOnce();
    expect(stateFn).toHaveBeenCalledOnce();
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
      states: { idle: [] },
    });

    reactor.destroy();

    expect(reactor.snapshot.get().status).toBe('destroyed');
  });

  it('destroy() is idempotent', () => {
    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: [] },
    });

    reactor.destroy();
    expect(() => reactor.destroy()).not.toThrow();
    expect(reactor.snapshot.get().status).toBe('destroyed');
  });

  it('does not run effects after destroy()', async () => {
    const src = signal(0);
    const fn = vi.fn(() => {
      src.get();
    });

    const reactor = createReactor({
      initial: 'idle' as const,
      context: {},
      states: { idle: [fn] },
    });

    reactor.destroy();
    fn.mockClear();

    src.set(1);
    await tick();

    expect(fn).not.toHaveBeenCalled();
  });
});
