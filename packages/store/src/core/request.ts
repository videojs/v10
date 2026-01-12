import type { EventLike } from '@videojs/utils/events';
import type { Guard } from './guard';
import type { TaskKey } from './task';

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

export type DefaultRequestRecord = Record<string, Request>;

export interface RequestContext<Target> {
  target: Target;
  signal: AbortSignal;
  meta: RequestMeta | null;
}

export type RequestKey<Input = unknown> = TaskKey | ((input: Input) => TaskKey);

export type RequestCancel<Input = unknown> = TaskKey | TaskKey[] | ((input: Input) => TaskKey | TaskKey[]);

export type RequestHandler<Target, Input = unknown, Output = unknown> = (
  input: Input,
  ctx: RequestContext<Target>,
) => Output | Promise<Output>;

export interface RequestConfig<Target, Input = unknown, Output = unknown> {
  key?: RequestKey<Input>;
  guard?: Guard<Target> | Guard<Target>[];
  cancel?: RequestCancel<Input>;
  handler: RequestHandler<Target, Input, Output>;
}

export interface ResolvedRequestConfig<Target, Input = unknown, Output = unknown> {
  key: RequestKey<Input>;
  guard: Guard<Target>[];
  cancel?: RequestCancel<Input> | undefined;
  handler: RequestHandler<Target, Input, Output>;
}

export type RequestHandlerRecord = {
  [K in string]: RequestHandler<any, any, any>;
};

export type RequestConfigMap<Target, Requests extends { [K in keyof Requests]: Request<any, any> }> = {
  [K in keyof Requests]: Requests[K] extends Request<infer I, infer O>
    ? RequestHandler<Target, I, O> | RequestConfig<Target, I, O>
    : never;
};

export type ResolvedRequestConfigMap<Target, Requests extends { [K in keyof Requests]: Request<any, any> }> = {
  [K in keyof Requests]: Requests[K] extends Request<infer I, infer O> ? ResolvedRequestConfig<Target, I, O> : never;
};

// ----------------------------------------
// Type Inference
// ----------------------------------------

export type InferRequestHandlerInput<Handler> = Handler extends () => any
  ? void
  : Handler extends (input: infer I, ctx?: any) => any
    ? I
    : Handler extends { handler: () => any }
      ? void
      : Handler extends { handler: (input: infer I, ctx?: any) => any }
        ? I
        : void;

export type InferRequestHandlerOutput<Handler> = Handler extends (...args: any[]) => infer O
  ? Awaited<O>
  : Handler extends { handler: (...args: any[]) => infer O }
    ? Awaited<O>
    : void;

export type ResolveRequestMap<Requests> = {
  [K in keyof Requests]: Request<InferRequestHandlerInput<Requests[K]>, InferRequestHandlerOutput<Requests[K]>>;
};

export type ResolveRequestHandler<R>
  = R extends Request<infer I, infer O>
    ? [I] extends [void]
        ? (input?: null, meta?: RequestMetaInit) => Promise<O>
        : (input: I, meta?: RequestMetaInit) => Promise<O>
    : never;

// ----------------------------------------
// Utilities
// ----------------------------------------

export function resolveRequests<Target, Requests extends { [K in keyof Requests]: Request<any, any> }>(
  requests: RequestConfigMap<Target, Requests>,
): ResolvedRequestConfigMap<Target, Requests> {
  const resolved: Record<string, ResolvedRequestConfig<Target>> = {};

  for (const [name, config] of Object.entries(requests) as [string, RequestHandler<Target> | RequestConfig<Target>][]) {
    if (isFunction(config)) {
      resolved[name] = {
        key: name,
        guard: [],
        handler: config,
      };
    } else {
      resolved[name] = {
        key: config.key ?? name,
        cancel: config.cancel,
        handler: config.handler,
        guard: config.guard ? (Array.isArray(config.guard) ? config.guard : [config.guard]) : [],
      };
    }
  }

  return resolved as ResolvedRequestConfigMap<Target, Requests>;
}

export function resolveRequestKey(keyConfig: RequestKey<any>, input: unknown): TaskKey {
  return isFunction(keyConfig) ? keyConfig(input) : keyConfig;
}

export function resolveRequestCancel(cancel: RequestCancel<any> | undefined, input: unknown): TaskKey[] {
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

export function isRequestMeta(value: unknown): value is RequestMeta {
  return isObject(value) && REQUEST_META in value;
}

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
