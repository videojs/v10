import type { Guard } from './guard';
import type { RequestMeta } from './meta';
import type { QueueKey, Schedule } from './queue';
import { isFunction } from '@videojs/utils';

/**
 * Create a slice for a target type.
 *
 * @example
 * // Curried form - infers state and requests from config
 * const audioSlice = createSlice<HTMLVideoElement>()({
 *   ...
 * });
 *
 * @example
 * // Explicit types
 * interface AudioState {
 *   volume: number;
 *   muted: boolean
 * }
 *
 * interface AudioRequests {
 *   setVolume: Request<number>;
 *   setMuted: Request<boolean>;
 * }
 * const audioSlice = createSlice<HTMLVideoElement, AudioState, AudioRequests>({...});
 */
export function createSlice<Target>(): SliceFactory<Target>;

export function createSlice<
  Target,
  State extends object,
  Requests extends RequestsDefinition,
>(config: SliceConfig<Target, State, Requests>): Slice<Target, State, Requests>;

export function createSlice<
  Target,
  State extends object = any,
  Requests extends RequestsDefinition = any,
>(
  config?: SliceConfig<Target, State, Requests>,
): Slice<Target, State, Requests> | SliceFactory<Target> {
  if (arguments.length === 0) {
    return (<S extends object, R extends RequestsDefinition>(
      config: SliceConfig<Target, S, R>,
    ): Slice<Target, S, R> => createSliceImpl(config)) as SliceFactory<Target>;
  }
  return createSliceImpl(config!);
}

function createSliceImpl<Target, State extends object, Requests extends RequestsDefinition>(
  config: SliceConfig<Target, State, Requests>,
): Slice<Target, State, Requests> {
  return {
    id: Symbol('slice'),
    ...config,
    request: resolveRequests(config.request),
  };
}

function resolveRequests<Target, Requests extends RequestsDefinition>(
  requests: RequestsConfig<Target, Requests>,
): ResolvedRequests<Target, Requests> {
  const resolved: Record<string, ResolvedRequestConfig<Target>> = {};

  for (const [name, config] of Object.entries(requests)) {
    if (isFunction(config)) {
      resolved[name] = {
        key: name,
        guard: [],
        cancel: undefined,
        schedule: undefined,
        handler: config,
      };
    } else {
      const cfg = config as RequestConfig<Target>;
      resolved[name] = {
        key: cfg.key ?? name,
        guard: cfg.guard ? (Array.isArray(cfg.guard) ? cfg.guard : [cfg.guard]) : [],
        cancel: cfg.cancel,
        schedule: cfg.schedule,
        handler: cfg.handler,
      };
    }
  }

  return resolved as ResolvedRequests<Target, Requests>;
}

export function resolveRequestKey(keyConfig: RequestKey<any>, input: unknown): QueueKey {
  return isFunction(keyConfig) ? keyConfig(input) : keyConfig;
}

export function resolveRequestCancelKeys(
  cancel: RequestCancel<any> | undefined,
  input: unknown,
): QueueKey[] {
  if (!cancel) return [];
  const result = isFunction(cancel) ? cancel(input) : cancel;
  return Array.isArray(result) ? result : [result];
}

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
  readonly request: ResolvedRequests<Target, Requests>;
}

/**
 * Configuration for creating a slice.
 */
export interface SliceConfig<Target, State extends object, Requests extends RequestsDefinition> {
  initialState: State;
  getSnapshot: SliceGetSnapshot<Target, State>;
  subscribe: SliceSubscribe<Target, State>;
  request: RequestsConfig<Target, Requests>;
}

export interface SliceGetSnapshotContext<Target, State> {
  target: Target;
  initialState: State;
}

export type SliceGetSnapshot<Target, State> = (ctx: SliceGetSnapshotContext<Target, State>) => State;

export interface SliceSubscribeContext<Target, State extends object> {
  target: Target;
  update: SliceUpdate<State>;
  signal: AbortSignal;
}

export type SliceSubscribe<Target, State extends object> = (ctx: SliceSubscribeContext<Target, State>) => void;

/**
 * Update function passed to slice subscribe.
 *
 * - `update()` - Full sync via getSnapshot
 * - `update({ volume: 0.5 })` - Partial update, only specified keys
 */
export interface SliceUpdate<State extends object> {
  (): void;
  (state: Partial<State>): void;
}

/**
 * Request type definition as [Input, Output] tuple.
 *
 * @example
 * interface AudioRequests {
 *   setVolume: Request<number>;        // input: number, output: void
 *   setMuted: Request<boolean>;        // input: boolean, output: void
 *   play: Request;                     // input: void, output: void
 *   getTime: Request<void, number>;    // input: void, output: number
 * }
 */
export type Request<Input = void, Output = void> = [input: Input, output: Output];

/**
 * Defines the shape of requests: input and output types.
 */
export interface RequestsDefinition {
  [name: string]: Request<any, any>;
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
export type RequestHandler<Target, Input = unknown, Output = unknown> = Input extends void
  ? (ctx: RequestContext<Target>) => Output | Promise<Output>
  : (input: Input, ctx: RequestContext<Target>) => Output | Promise<Output>;

/**
 * Request cancel configuration - array of keys or function that derives keys from input.
 */
export type RequestCancel<Input = unknown>
  = | QueueKey
    | QueueKey[]
    | ((input: Input) => QueueKey | QueueKey[]);

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
 * Configuration for requests - shorthand or full config.
 */
export type RequestsConfig<Target, Requests extends RequestsDefinition> = {
  [K in keyof Requests]: Requests[K] extends Request<infer I, infer O>
    ? RequestHandler<Target, I, O> | RequestConfig<Target, I, O>
    : never;
};

/**
 * Resolved request config.
 */
export interface ResolvedRequestConfig<Target, Input = unknown, Output = unknown> {
  key: RequestKey<Input>;
  schedule: Schedule | undefined;
  guard: Guard<Target>[];
  cancel: RequestCancel<Input> | undefined;
  handler: RequestHandler<Target, Input, Output>;
}

export type ResolvedRequests<Target, Requests extends RequestsDefinition> = {
  [K in keyof Requests]: Requests[K] extends Request<infer I, infer O>
    ? ResolvedRequestConfig<Target, I, O>
    : never;
};

export interface SliceFactory<Target> {
  <const C extends SliceStructure<Target>>(config: C): InferSlice<Target, C>;
}

export interface SliceStructure<Target> {
  initialState: object;
  getSnapshot: (ctx: { target: Target; initialState: any }) => any;
  subscribe: (ctx: { target: Target; update: any; signal: AbortSignal }) => void;
  request: Record<string, ((...args: any[]) => any) | { handler: (...args: any[]) => any }>;
}

// ----------------------------------------
// Type Inference
// ----------------------------------------

export type InferSlice<Target, Config> = Config extends {
  initialState: infer S extends object;
  request: infer R;
}
  ? Slice<Target, S, InferRequestsDefinition<Target, R>>
  : never;

export type InferSliceTarget<S> = S extends Slice<infer T, any, any> ? T : never;

export type InferSliceState<S> = S extends Slice<any, infer State, any> ? State : never;

export type InferSliceRequests<S> = S extends Slice<any, any, infer Requests>
  ? { [K in keyof Requests]: InferRequestFn<Requests[K]> }
  : never;

export type InferRequestFn<R> = R extends Request<infer Input, infer Output>
  ? Input extends void
    ? (meta?: Omit<RequestMeta, symbol>) => Promise<Output>
    : (input: Input, meta?: Omit<RequestMeta, symbol>) => Promise<Output>
  : never;

export type InferTaskTypes<S> = S extends Slice<any, any, infer Requests>
  ? {
      [K in keyof Requests & string]: Requests[K] extends Request<infer I, infer O>
        ? { input: I; output: O }
        : { input: unknown; output: unknown };
    }
  : never;

export type InferRequestInput<T, Target> = T extends (ctx: RequestContext<Target>) => any
  ? void
  : T extends (input: infer I, ctx: RequestContext<Target>) => any
    ? I
    : T extends { handler: (ctx: RequestContext<Target>) => any }
      ? void
      : T extends { handler: (input: infer I, ctx: RequestContext<Target>) => any }
        ? I
        : unknown;

export type InferRequestOutput<T, Target> = T extends (ctx: RequestContext<Target>) => infer O
  ? Awaited<O>
  : T extends (input: any, ctx: RequestContext<Target>) => infer O
    ? Awaited<O>
    : T extends { handler: (...args: any[]) => infer O }
      ? Awaited<O>
      : unknown;

export type InferRequestsDefinition<Target, Config> = {
  [K in keyof Config]: Request<
    InferRequestInput<Config[K], Target>,
    InferRequestOutput<Config[K], Target>
  >;
};
