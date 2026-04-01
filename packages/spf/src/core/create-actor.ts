import type { ActorSnapshot, SignalActor } from './actor';
import { signal, untrack, update } from './signals/primitives';
import type { TaskLike } from './task';

// =============================================================================
// Runner interfaces
// =============================================================================

/**
 * Minimal interface for any runner that can be used with createActor.
 */
export interface RunnerLike {
  schedule<Value = void, Err = unknown>(task: TaskLike<Value, Err>): Promise<Value>;
  abortAll(): void;
  destroy(): void;
}

/**
 * Extended runner interface for runners that support `onSettled` state declarations.
 */
export interface SettledRunnerLike extends RunnerLike {
  whenSettled(callback: () => void): void;
}

function hasWhenSettled(runner: RunnerLike): runner is SettledRunnerLike {
  return 'whenSettled' in runner;
}

// =============================================================================
// Definition types
// =============================================================================

/**
 * Context passed to message handlers.
 * `runner` is present and typed as the exact runner instance only when the
 * definition includes a runner factory.
 */
export type HandlerContext<
  UserStatus extends string,
  Context extends object,
  RunnerFactory extends (() => RunnerLike) | undefined,
> = {
  transition: (to: UserStatus) => void;
  context: Context;
  setContext: (next: Context) => void;
} & (RunnerFactory extends () => infer R ? { runner: R } : object);

/**
 * Definition for a single user-defined state.
 */
export type ActorStateDefinition<
  UserStatus extends string,
  Context extends object,
  Message extends { type: string },
  RunnerFactory extends (() => RunnerLike) | undefined,
> = {
  /**
   * When the actor's runner settles while in this state, automatically
   * transition to this status. The framework owns the generation-token logic —
   * re-registering after each `runner.schedule()` call so that
   * `abortAll()` + reschedule correctly supersedes stale callbacks.
   */
  onSettled?: UserStatus;
  /** Message handlers active in this state. Messages with no handler are silently dropped. */
  on?: {
    [M in Message as M['type']]?: (
      message: Extract<Message, { type: M['type'] }>,
      ctx: HandlerContext<UserStatus, Context, RunnerFactory>
    ) => void;
  };
};

/**
 * Full actor definition passed to `createActor`.
 *
 * `UserStatus` is the set of domain-meaningful states. `'destroyed'` is always
 * added by the framework as the implicit terminal state — do not include it here.
 */
export type ActorDefinition<
  UserStatus extends string,
  Context extends object,
  Message extends { type: string },
  RunnerFactory extends (() => RunnerLike) | undefined = undefined,
> = {
  /**
   * Runner factory — called once at `createActor()` time.
   * The runner lives for the full actor lifetime and is destroyed with it.
   *
   * @example
   * runner: () => new SerialRunner()
   */
  runner?: RunnerFactory;
  /** Initial status. */
  initial: UserStatus;
  /** Initial context. */
  context: Context;
  /**
   * Per-state definitions. States with no definition silently drop all messages.
   * All user-defined states must appear as keys in the `UserStatus` union.
   */
  states: Partial<Record<UserStatus, ActorStateDefinition<UserStatus, Context, Message, RunnerFactory>>>;
};

// =============================================================================
// Live actor interface
// =============================================================================

/** Live actor instance returned by `createActor`. */
export interface MessageActor<Status extends string, Context extends object, Message extends { type: string }>
  extends SignalActor<Status, Context> {
  send(message: Message): void;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Creates a message-driven actor from a declarative definition.
 *
 * The actor owns a reactive snapshot signal (status + context), an optional
 * runner, and dispatches incoming messages to per-state handlers. `'destroyed'`
 * is always the implicit terminal state — `destroy()` transitions there
 * unconditionally and all subsequent `send()` calls are no-ops.
 *
 * When a state declares `onSettled`, the framework calls `runner.whenSettled()`
 * after the handler returns. The runner owns the generation-token logic — if
 * new tasks are scheduled before the current batch settles, the callback is
 * automatically superseded.
 *
 * @example
 * const actor = createActor({
 *   runner: () => new SerialRunner(),
 *   initial: 'idle',
 *   context: {},
 *   states: {
 *     idle: {
 *       on: {
 *         load: (msg, { transition, runner }) => {
 *           segments.forEach(s => runner.schedule(new Task(...)));
 *           transition('loading');
 *         }
 *       }
 *     },
 *     loading: {
 *       onSettled: 'idle',
 *       on: {
 *         load: (msg, { runner }) => {
 *           runner.abortAll();
 *           segments.forEach(s => runner.schedule(new Task(...)));
 *         }
 *       }
 *     }
 *   }
 * });
 */
export function createActor<
  UserStatus extends string,
  Context extends object,
  Message extends { type: string },
  RunnerFactory extends (() => RunnerLike) | undefined = undefined,
>(
  def: ActorDefinition<UserStatus, Context, Message, RunnerFactory>
): MessageActor<UserStatus | 'destroyed', Context, Message> {
  type FullStatus = UserStatus | 'destroyed';

  const runner = def.runner?.() as RunnerLike | undefined;
  const snapshotSignal = signal<ActorSnapshot<FullStatus, Context>>({
    status: def.initial as FullStatus,
    context: def.context,
  });

  const getStatus = (): FullStatus => untrack(() => snapshotSignal.get().status);
  const getContext = (): Context => untrack(() => snapshotSignal.get().context);

  const transition = (to: FullStatus): void => {
    update(snapshotSignal, { status: to });
  };

  const setContext = (context: Context): void => {
    update(snapshotSignal, { context });
  };

  return {
    get snapshot() {
      return snapshotSignal;
    },

    send(message: Message): void {
      const status = getStatus();
      if (status === 'destroyed') return;
      const stateDef = def.states[status as UserStatus];
      const handler = stateDef?.on?.[message.type as keyof typeof stateDef.on] as
        | ((msg: Message, ctx: HandlerContext<UserStatus, Context, RunnerFactory>) => void)
        | undefined;
      if (!handler) return;
      handler(message, {
        context: getContext(),
        transition: (to: UserStatus) => transition(to as FullStatus),
        setContext,
        ...(runner ? { runner } : {}),
      } as HandlerContext<UserStatus, Context, RunnerFactory>);
      // Register onSettled after the handler so we read the post-transition status.
      const newStatus = getStatus();
      if (newStatus !== 'destroyed') {
        const newStateDef = def.states[newStatus as UserStatus];
        if (newStateDef?.onSettled && runner && hasWhenSettled(runner)) {
          const targetStatus = newStateDef.onSettled as FullStatus;
          runner.whenSettled(() => {
            if (getStatus() !== newStatus) return;
            transition(targetStatus);
          });
        }
      }
    },

    destroy(): void {
      if (getStatus() === 'destroyed') return;
      runner?.destroy();
      transition('destroyed');
    },
  };
}
