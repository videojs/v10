import type { Guard } from './guard';
import type { RequestMeta } from './meta';
import type { QueueKey, Schedule } from './queue';
import { isFunction } from '@videojs/utils';

// ----------------------------------------
// Types
// ----------------------------------------

/**
 * A slice defines a piece of state, how to sync it from a target, and requests to modify the target.
 */
export interface Slice<Target, State extends object, Requests extends RequestsDefinition> {
  readonly id: symbol;
  readonly initialState: State;
  readonly getSnapshot: SliceGetSnapshot<Target, State>;
  readonly subscribe: SliceSubscribe<Target, State>;
  readonly requests: ResolvedRequests<Target, Requests>;
}

/**
 * Slice definition for cross-platform scenarios.
 */
export interface SliceDefinition<State extends object, Requests extends RequestsDefinition> {
  readonly id: symbol;
  readonly initialState: State;
  readonly requests: { [K in keyof Requests]: { key?: RequestKey<any> } };
}

/**
 * Configuration for creating a slice.
 */
export interface SliceConfig<Target, State extends object, Requests extends RequestsDefinition> {
  initialState: State;
  getSnapshot: SliceGetSnapshot<Target, State>;
  subscribe: SliceSubscribe<Target, State>;
  requests: RequestsConfig<Target, Requests>;
}

/**
 * Implementation for a slice definition.
 */
export interface SliceImplementation<Target, State extends object, Requests extends RequestsDefinition> {
  getSnapshot: SliceGetSnapshot<Target, State>;
  subscribe: SliceSubscribe<Target, State>;
  requests: RequestsImplConfig<Target, Requests>;
}

export type SliceGetSnapshot<Target, State> = (ctx: {
  target: Target;
  initialState: State;
}) => State;

export type SliceSubscribe<Target, State extends object> = (ctx: {
  target: Target;
  update: SliceUpdate<State>;
  signal: AbortSignal;
}) => void;

/**
 * Update function passed to slice subscribe.
 *
 * - `update()` - Full sync via getSnapshot
 * - `update({ volume: 0.5 })` - Partial update, only specified keys
 */
export interface SliceUpdate<State extends object> {
  (): void;
  (state: Partial<State>): void;
};

/**
 * Defines the shape of requests: input and output types.
 */
export interface RequestsDefinition {
  [name: string]: RequestDefinition<any, any>;
}

/**
 * Type-level definition of a request's input and output.
 */
export interface RequestDefinition<Input, Output> {
  __input: Input;
  __output: Output;
}

/**
 * Context passed to request handlers.
 */
export interface RequestContext<Target> {
  target: Target;
  signal: AbortSignal;
  meta: RequestMeta;
}

/**
 * Request key - string or function that derives key from input.
 */
export type RequestKey<Input = unknown> = QueueKey | ((input: Input) => QueueKey);

/**
 * Request handler function type.
 */
export type RequestHandler<Target, Input = unknown, Output = unknown>
  = Input extends void
    ? (ctx: RequestContext<Target>) => Output | Promise<Output>
    : (input: Input, ctx: RequestContext<Target>) => Output | Promise<Output>;

/**
 * Request cancel configuration - array of keys or function that derives keys from input.
 */
export type RequestCancel<Input = unknown> = QueueKey | QueueKey[] | ((input: Input) => QueueKey | QueueKey[]);

/**
 * Full request configuration.
 */
export interface RequestConfig<Target, Input = unknown, Output = unknown> {
  key?: RequestKey<Input>;
  schedule?: Schedule;
  guard?: Guard<Target> | Guard<Target>[];
  cancel?: RequestCancel<Input>;
  handler: RequestHandler<Target, Input, Output>;
}

/**
 * Request implementation config (no key, comes from definition).
 */
export interface RequestImplConfig<Target, Input = unknown, Output = unknown> {
  schedule?: Schedule;
  guard?: Guard<Target> | Guard<Target>[];
  handler: RequestHandler<Target, Input, Output>;
}

/**
 * Configuration for requests - shorthand or full config.
 */
export type RequestsConfig<Target, Requests extends RequestsDefinition> = {
  [K in keyof Requests]: Requests[K] extends RequestDefinition<infer I, infer O>
    ? RequestHandler<Target, I, O> | RequestConfig<Target, I, O>
    : never;
};

/**
 * Implementation config for requests.
 */
export type RequestsImplConfig<Target, Requests extends RequestsDefinition> = {
  [K in keyof Requests]: Requests[K] extends RequestDefinition<infer I, infer O>
    ? RequestHandler<Target, I, O> | RequestImplConfig<Target, I, O>
    : never;
};

/**
 * Resolved request config.
 */
export interface ResolvedRequestConfig<Target, Input = any, Output = any> {
  key: RequestKey<Input>;
  schedule: Schedule | undefined;
  guard: Guard<Target>[];
  cancel: RequestCancel<Input> | undefined;
  handler: RequestHandler<Target, Input, Output>;
}

export type ResolvedRequests<Target, Requests extends RequestsDefinition> = {
  [K in keyof Requests]: ResolvedRequestConfig<Target>;
};

// ----------------------------------------
// Implementation
// ----------------------------------------

/**
 * Create a slice for a target type.
 *
 * @example
 * // Infer state and requests from config
 * const audioSlice = createSlice<Media>({...});
 *
 * @example
 * // Explicit state and requests types
 * const audioSlice = createSlice<Media, AudioState, AudioRequests>({...});
 */
export function createSlice<
  Target,
  State extends object = any,
  Requests extends RequestsDefinition = any,
>(
  config: SliceConfig<Target, State, Requests>,
): Slice<Target, State, Requests>;

export function createSlice<
  Target,
  State extends object = any,
  Requests extends RequestsDefinition = any,
>(
  definition: SliceDefinition<State, Requests>,
  implementation: SliceImplementation<Target, State, Requests>,
): Slice<Target, State, Requests>;

export function createSlice<
  Target,
  State extends object = any,
  Requests extends RequestsDefinition = any,
>(
  configOrDef: SliceConfig<Target, State, Requests> | SliceDefinition<State, Requests>,
  impl?: SliceImplementation<Target, State, Requests>,
): Slice<Target, State, Requests> {
  if (impl) {
    const def = configOrDef as SliceDefinition<State, Requests>;
    return {
      id: def.id,
      initialState: def.initialState,
      getSnapshot: impl.getSnapshot,
      subscribe: impl.subscribe,
      requests: resolveRequests(def.requests, impl.requests),
    };
  }

  const config = configOrDef as SliceConfig<Target, State, Requests>;

  return {
    id: Symbol('slice'),
    ...config,
    requests: resolveRequestsStandalone(config.requests),
  };
}

/**
 * Create a slice definition for cross-platform scenarios.
 */
export function defineSlice<State extends object, Requests extends RequestsDefinition>(
  definition: {
    initialState: State;
    requests: { [K in keyof Requests]: { key?: RequestKey<any> } };
  },
): SliceDefinition<State, Requests> {
  return { id: Symbol('slice/def'), ...definition };
}

function resolveRequestsStandalone<Target, Requests extends RequestsDefinition>(
  requests: RequestsConfig<Target, Requests>,
): ResolvedRequests<Target, Requests> {
  const resolved: Record<string, ResolvedRequestConfig<Target>> = {};

  for (const [name, config] of Object.entries(requests)) {
    if (isFunction(config)) {
      resolved[name] = {
        key: name,
        guard: [],
        cancel: undefined,
        handler: config,
        schedule: undefined,
      };
    } else {
      resolved[name] = {
        key: config.key ?? name,
        guard: config.guard ? (Array.isArray(config.guard) ? config.guard : [config.guard]) : [],
        cancel: config.cancels,
        ...config,
      };
    }
  }

  return resolved as ResolvedRequests<Target, Requests>;
}

function resolveRequests<Target, Requests extends RequestsDefinition>(
  defRequests: { [K in keyof Requests]: { key?: RequestKey<any> } },
  implRequests: RequestsImplConfig<Target, Requests>,
): ResolvedRequests<Target, Requests> {
  const resolved: Record<string, ResolvedRequestConfig<Target>> = {};

  for (const [name, def] of Object.entries(defRequests)) {
    if (isFunction(implRequests)) {
      resolved[name] = {
        key: def.key ?? name,
        guard: [],
        cancel: undefined,
        handler: implRequests,
        schedule: undefined,
      };
    } else {
      const impl = (implRequests as Record<string, any>)[name];
      resolved[name] = {
        key: def.key ?? name,
        guard: impl.guard ? (Array.isArray(impl.guard) ? impl.guard : [impl.guard]) : [],
        cancel: impl.cancels,
        ...impl,
      };
    }
  }

  return resolved as ResolvedRequests<Target, Requests>;
}

export function resolveRequestKey(keyConfig: RequestKey, input: unknown): QueueKey {
  return isFunction(keyConfig) ? keyConfig(input) : keyConfig;
}

export function resolveRequestCancelKeys(cancel: RequestCancel | undefined, input: unknown): QueueKey[] {
  if (!cancel) return [];
  const result = isFunction(cancel) ? cancel(input) : cancel;
  return Array.isArray(result) ? result : [result];
}

// ----------------------------------------
// Type Inference
// ----------------------------------------

export type InferSliceState<S> = S extends Slice<any, infer State, any> ? State : never;

export type InferSliceRequests<S> = S extends Slice<any, any, infer Requests>
  ? { [K in keyof Requests]: InferSliceRequestFn<Requests[K]> }
  : never;

export type InferSliceRequestFn<R> = R extends { __input: infer Input; __output: infer Output }
  ? Input extends void
    ? (meta?: Omit<RequestMeta, symbol>) => Promise<Output>
    : (input: Input, meta?: Omit<RequestMeta, symbol>) => Promise<Output>
  : never;

export type InferSliceTaskTypes<S> = S extends Slice<any, any, infer Requests>
  ? {
      [K in keyof Requests & string]: Requests[K] extends { __input: infer I; __output: infer O }
        ? { input: I; output: O }
        : { input: unknown; output: unknown };
    }
  : never;
