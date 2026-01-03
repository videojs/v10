import type { EventLike } from '@videojs/utils/events';
import type { Guard } from './guard';
import type { TaskKey, TaskScheduler } from './queue';

import { isFunction, isObject } from '@videojs/utils/predicate';

// ----------------------------------------
// Symbols
// ----------------------------------------

export const REQUEST_META: unique symbol = Symbol.for('@videojs/request');

// ----------------------------------------
// Types
// ----------------------------------------

export interface Request<Input = void, Output = void> {
  input: Input;
  output: Output;
}

export type RequestRecord = {
  [K in string]: Request<any, any>;
};

/**
 * Default loose request types.
 */
export type DefaultRequestRecord = Record<string, Request>;

/**
 * Context passed to request handlers.
 */
export interface RequestContext<Target> {
  target: Target;
  signal: AbortSignal;
  meta: RequestMeta | null;
}

/**
 * Request key - static or derived from input.
 */
export type RequestKey<Input = unknown> = TaskKey | ((input: Input) => TaskKey);

/**
 * Request cancel config.
 */
export type RequestCancel<Input = unknown> = TaskKey | TaskKey[] | ((input: Input) => TaskKey | TaskKey[]);

/**
 * Request handler function.
 */
export type RequestHandler<Target, Input = unknown, Output = unknown> = (
  input: Input,
  ctx: RequestContext<Target>,
) => Output | Promise<Output>;

/**
 * Full request config.
 */
export interface RequestConfig<Target, Input = unknown, Output = unknown> {
  key?: RequestKey<Input>;
  schedule?: TaskScheduler;
  guard?: Guard<Target> | Guard<Target>[];
  cancel?: RequestCancel<Input>;
  handler: RequestHandler<Target, Input, Output>;
}

/**
 * Resolved request config (after normalization).
 */
export interface ResolvedRequestConfig<Target, Input = unknown, Output = unknown> {
  key: RequestKey<Input>;
  schedule?: TaskScheduler | undefined;
  guard: Guard<Target>[];
  cancel?: RequestCancel<Input> | undefined;
  handler: RequestHandler<Target, Input, Output>;
}

export type RequestHandlerRecord = {
  [K in string]: RequestHandler<any, any, any>;
};

/**
 * Map of request names to handlers or configs. This is the config passed to `createSlice`.
 */
export type RequestConfigMap<Target, Requests extends RequestRecord> = {
  [K in keyof Requests]: Requests[K] extends Request<infer I, infer O>
    ? RequestHandler<Target, I, O> | RequestConfig<Target, I, O>
    : never;
};

/**
 * Map of request config objects to resolved configs. This is the config stored internally in
 * the store.
 */
export type ResolvedRequestConfigMap<Target, Requests extends RequestRecord> = {
  [K in keyof Requests]: Requests[K] extends Request<infer I, infer O> ? ResolvedRequestConfig<Target, I, O> : never;
};

// ----------------------------------------
// Type Inference
// ----------------------------------------

/**
 * Infer the input type of a RequestHandler.
 */
export type InferRequestHandlerInput<Handler> = Handler extends () => any
  ? void
  : Handler extends (input: infer I, ctx?: any) => any
    ? I
    : Handler extends { handler: () => any }
      ? void
      : Handler extends { handler: (input: infer I, ctx?: any) => any }
        ? I
        : void;

/**
 * Infer the output type of a RequestHandler.
 */
export type InferRequestHandlerOutput<Handler> = Handler extends (...args: any[]) => infer O
  ? Awaited<O>
  : Handler extends { handler: (...args: any[]) => infer O }
    ? Awaited<O>
    : void;

/**
 * Resolve a RequestHandlerRecord to a RequestRecord.
 */
export type ResolveRequestMap<Requests> = {
  [K in keyof Requests]: Request<InferRequestHandlerInput<Requests[K]>, InferRequestHandlerOutput<Requests[K]>>;
};

/**
 * Resolve a Request (input/output) to its function signature.
 */
export type ResolveRequestHandler<R>
  = R extends Request<infer I, infer O>
    ? [I] extends [void]
        ? (input?: null, meta?: RequestMetaInit) => Promise<O>
        : (input: I, meta?: RequestMetaInit) => Promise<O>
    : never;

// ----------------------------------------
// Utilities
// ----------------------------------------

export function resolveRequests<Target, Requests extends RequestRecord>(
  requests: RequestConfigMap<Target, Requests>,
): ResolvedRequestConfigMap<Target, Requests> {
  const resolved: Record<string, ResolvedRequestConfig<Target>> = {};

  for (const [name, config] of Object.entries(requests)) {
    if (isFunction(config)) {
      resolved[name] = {
        key: name,
        guard: [],
        handler: config,
      };
    } else {
      resolved[name] = {
        ...config,
        guard: config.guard ? (Array.isArray(config.guard) ? config.guard : [config.guard]) : [],
      };
    }
  }

  return resolved as ResolvedRequestConfigMap<Target, Requests>;
}

export function resolveRequestKey(keyConfig: RequestKey<any>, input: unknown): TaskKey {
  return isFunction(keyConfig) ? keyConfig(input) : keyConfig;
}

export function resolveRequestCancelKeys(cancel: RequestCancel<any> | undefined, input: unknown): TaskKey[] {
  if (!cancel) return [];
  const result = isFunction(cancel) ? cancel(input) : cancel;
  return Array.isArray(result) ? result : [result];
}

// ----------------------------------------
// Request Meta
// ----------------------------------------

export type RequestMetaInit<Context = unknown> = Omit<RequestMeta<Context>, typeof REQUEST_META>;

export interface RequestMeta<Context = unknown> {
  [REQUEST_META]: true;
  source?: string;
  timestamp?: number;
  reason?: string;
  context?: Context | undefined;
}

export function createRequestMeta<Context = unknown>(init: RequestMetaInit<Context>): RequestMeta<Context> {
  return {
    [REQUEST_META]: true,
    ...init,
    timestamp: init.timestamp ?? Date.now(),
  };
}

/**
 * Check if a value is a RequestMeta object.
 */
export function isRequestMeta(value: unknown): value is RequestMeta {
  return isObject(value) && REQUEST_META in value;
}

/**
 * Convert an event-like object to RequestMeta.
 */
export function createRequestMetaFromEvent<Context = unknown>(
  event: EventLike,
  context?: Context,
): RequestMeta<Context> {
  return {
    [REQUEST_META]: true,
    source: event.isTrusted ? 'user' : 'system',
    timestamp: event.timeStamp,
    reason: event.type,
    context,
  };
}
