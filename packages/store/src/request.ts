import type { EventLike } from '@videojs/utils';
import type { Guard } from './guard';
import type { QueueKey, Schedule } from './queue';
import { isFunction, isObject } from '@videojs/utils';

// ----------------------------------------
// Symbols
// ----------------------------------------

export const REQUEST_META: unique symbol = Symbol.for('@videojs/request');

// ----------------------------------------
// Types
// ----------------------------------------

/**
 * Request type definition tuple.
 */
export interface Request<Input = void, Output = void> {
  __input: Input;
  __output: Output;
}

/**
 * Request schemas for a slice.
 */
export type RequestRecord = Record<string, Request<any, any>>;

/**
 * Context passed to request handlers.
 */
export interface RequestContext<Target> {
  target: Target;
  signal: AbortSignal;
  meta: RequestMeta;
}

/**
 * Request key - static or derived from input.
 */
export type RequestKey<Input = unknown> = QueueKey | ((input: Input) => QueueKey);

/**
 * Request cancel config.
 */
export type RequestCancel<Input = unknown>
  = | QueueKey
    | QueueKey[]
    | ((input: Input) => QueueKey | QueueKey[]);

/**
 * Request handler function.
 */
export type RequestHandler<Target, Input, Output> = [Input] extends [void]
  ? (ctx: RequestContext<Target>) => Output | Promise<Output>
  : (input: Input, ctx: RequestContext<Target>) => Output | Promise<Output>;

/**
 * Full request config.
 */
export interface RequestConfig<Target, Input = unknown, Output = unknown> {
  key?: RequestKey<Input>;
  schedule?: Schedule;
  guard?: Guard<Target> | Guard<Target>[];
  cancel?: RequestCancel<Input>;
  handler: RequestHandler<Target, Input, Output>;
}

/**
 * Resolved request config (after normalization).
 */
export interface ResolvedRequestConfig<Target, Input = unknown, Output = unknown> {
  key: RequestKey<Input>;
  schedule: Schedule | undefined;
  guard: Guard<Target>[];
  cancel: RequestCancel<Input> | undefined;
  handler: RequestHandler<Target, Input, Output>;
}

export type RequestsConfig<Target, Requests extends { [K in keyof Requests]: Request<any, any> }> = {
  [K in keyof Requests]: Requests[K] extends Request<infer I, infer O>
    ? RequestHandler<Target, I, O> | RequestConfig<Target, I, O>
    : never;
};

export type ResolvedRequests<Target, Requests extends { [K in keyof Requests]: Request<any, any> }> = {
  [K in keyof Requests]: Requests[K] extends Request<infer I, infer O>
    ? ResolvedRequestConfig<Target, I, O>
    : never;
};

// ----------------------------------------
// Type Inference
// ----------------------------------------

export type InferInput<Handler, Target> = Handler extends (ctx: RequestContext<Target>) => any
  ? void
  : Handler extends (input: infer I, ctx: RequestContext<Target>) => any
    ? I
    : Handler extends { handler: (ctx: RequestContext<Target>) => any }
      ? void
      : Handler extends { handler: (input: infer I, ctx: RequestContext<Target>) => any }
        ? I
        : unknown;

export type InferOutput<Handler, Target> = Handler extends (ctx: RequestContext<Target>) => infer O
  ? Awaited<O>
  : Handler extends (input: any, ctx: RequestContext<Target>) => infer O
    ? Awaited<O>
    : Handler extends { handler: (...args: any[]) => infer O }
      ? Awaited<O>
      : unknown;

export type InferRequests<Target, Requests> = {
  [K in keyof Requests]: Request<InferInput<Requests[K], Target>, InferOutput<Requests[K], Target>>;
};

export type InferRequestHandler<R> = R extends Request<infer I, infer O>
  ? [I] extends [void]
      ? (meta?: Omit<RequestMeta, symbol>) => Promise<O>
      : (input: I, meta?: Omit<RequestMeta, symbol>) => Promise<O>
  : never;

// ----------------------------------------
// Utilities
// ----------------------------------------

export function resolveRequests<Target, Requests extends { [K in keyof Requests]: Request<any, any> }>(
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
// Request Meta
// ----------------------------------------

export interface RequestMeta<Context = unknown> {
  [REQUEST_META]: true;
  source?: string;
  timestamp?: number;
  reason?: string;
  context?: Context | undefined;
}

export function createRequestMeta<Context = unknown>(
  meta: Omit<RequestMeta<Context>, typeof REQUEST_META>,
): RequestMeta<Context> {
  return {
    [REQUEST_META]: true,
    ...meta,
    timestamp: meta.timestamp ?? Date.now(),
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
