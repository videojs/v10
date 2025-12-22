import type { Guard } from './guard';

// ----------------------------------------
// Symbols & Meta
// ----------------------------------------

/** Symbol to identify RequestMeta objects */
export const REQUEST_META = Symbol.for('videojs.store.requestMeta');

/**
 * Metadata for requests.
 */
export interface RequestMeta<Context = unknown> {
  [REQUEST_META]: true;
  source: string;
  timestamp: number;
  reason?: string;
  context?: Context;
}

/**
 * Create a RequestMeta object.
 */
export function createMeta<Context = unknown>(
  meta: Omit<RequestMeta<Context>, typeof REQUEST_META | 'timestamp'> & { timestamp?: number },
): RequestMeta<Context> {
  return {
    ...meta,
    timestamp: meta.timestamp ?? Date.now(),
    [REQUEST_META]: true,
  };
}

/**
 * Check if a value is a RequestMeta object.
 */
export function isRequestMeta(value: unknown): value is RequestMeta {
  return typeof value === 'object' && value !== null && (value as any)[REQUEST_META] === true;
}

/**
 * Check if a value looks like an Event (has type and timeStamp).
 * Works with DOM Events, React SyntheticEvents, and RN events.
 */
export function isEventLike(value: unknown): value is { type: string; timeStamp: number } {
  return (
    value !== null
    && typeof value === 'object'
    && 'type' in value
    && 'timeStamp' in value
    && typeof (value as any).type === 'string'
    && typeof (value as any).timeStamp === 'number'
  );
}

/**
 * Convert an event-like object to RequestMeta.
 */
export function metaFromEvent<Context = unknown>(
  event: { type: string; timeStamp: number },
  context?: Context,
): RequestMeta<Context> {
  return {
    source: 'user',
    timestamp: event.timeStamp,
    reason: event.type,
    context,
    [REQUEST_META]: true,
  };
}

// ----------------------------------------
// Schedule
// ----------------------------------------

/**
 * A schedule function controls when a request flushes.
 * Returns an optional cancel function.
 */
export type Schedule = (flush: () => void) => (() => void) | void;

/**
 * Delay execution by ms. Resets on each new request.
 */
export function delay(ms: number): Schedule {
  return (flush) => {
    const id = setTimeout(flush, ms);
    return () => clearTimeout(id);
  };
}

// ----------------------------------------
// Types
// ----------------------------------------

/**
 * A slice defines a piece of state, how to sync it from a target,
 * and requests to modify the target.
 */
export interface Slice<Target, State extends object, Requests extends RequestsDefinition> {
  readonly id: symbol;
  readonly initialState: State;
  readonly getSnapshot: GetSnapshotFn<Target, State>;
  readonly subscribe: SubscribeFn<Target>;
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
  getSnapshot: GetSnapshotFn<Target, State>;
  subscribe: SubscribeFn<Target>;
  requests: RequestsConfig<Target, Requests>;
}

/**
 * Implementation for a slice definition.
 */
export interface SliceImplementation<Target, State extends object, Requests extends RequestsDefinition> {
  getSnapshot: GetSnapshotFn<Target, State>;
  subscribe: SubscribeFn<Target>;
  requests: RequestsImplConfig<Target, Requests>;
}

export type GetSnapshotFn<Target, State> = (ctx: {
  target: Target;
  initialState: State;
}) => State;

export type SubscribeFn<Target> = (ctx: {
  target: Target;
  update: () => void;
  signal: AbortSignal;
}) => void;

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
export type RequestKey<Input> = string | ((input: Input) => string | symbol);

/**
 * Request handler function type.
 */
export type RequestHandler<Target, Input, Output>
  = Input extends void
    ? (ctx: RequestContext<Target>) => Output | Promise<Output>
    : (input: Input, ctx: RequestContext<Target>) => Output | Promise<Output>;

/**
 * Full request configuration.
 */
export interface RequestConfig<Target, Input, Output> {
  key?: RequestKey<Input>;
  schedule?: Schedule;
  guard?: Guard<Target> | Guard<Target>[];
  handler: RequestHandler<Target, Input, Output>;
}

/**
 * Request implementation config (no key, comes from definition).
 */
export interface RequestImplConfig<Target, Input, Output> {
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
export interface ResolvedRequestConfig<Target, Input = any> {
  key: RequestKey<Input>;
  schedule?: Schedule;
  guard: Guard<Target>[];
  handler: Function;
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
 * const audioSlice = createSlice<Player>({...});
 *
 * @example
 * // Explicit state and requests types
 * const audioSlice = createSlice<Player, AudioState, AudioRequests>({...});
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
    id: Symbol(),
    initialState: config.initialState,
    getSnapshot: config.getSnapshot,
    subscribe: config.subscribe,
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
  return {
    id: Symbol(),
    initialState: definition.initialState,
    requests: definition.requests,
  };
}

function resolveRequestsStandalone<Target, Requests extends RequestsDefinition>(
  requests: RequestsConfig<Target, Requests>,
): ResolvedRequests<Target, Requests> {
  const resolved: Record<string, ResolvedRequestConfig<Target>> = {};

  for (const [name, config] of Object.entries(requests)) {
    if (typeof config === 'function') {
      resolved[name] = {
        key: name,
        guard: [],
        handler: config,
      };
    } else {
      const cfg = config as RequestConfig<Target, any, any>;
      resolved[name] = {
        key: cfg.key ?? name,
        schedule: cfg.schedule,
        guard: cfg.guard ? (Array.isArray(cfg.guard) ? cfg.guard : [cfg.guard]) : [],
        handler: cfg.handler,
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
    const impl = (implRequests as Record<string, any>)[name];
    const defTyped = def as { key?: RequestKey<any> };

    if (typeof impl === 'function') {
      resolved[name] = {
        key: defTyped.key ?? name,
        guard: [],
        handler: impl,
      };
    } else {
      resolved[name] = {
        key: defTyped.key ?? name,
        schedule: impl.schedule,
        guard: impl.guard ? (Array.isArray(impl.guard) ? impl.guard : [impl.guard]) : [],
        handler: impl.handler,
      };
    }
  }

  return resolved as ResolvedRequests<Target, Requests>;
}
