import type { EventLike } from '@videojs/utils/events';
import { isObject } from '@videojs/utils/predicate';

export const REQUEST_META = Symbol.for('@videojs/request');

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
  context?: Context
): RequestMeta<Context> {
  return {
    [REQUEST_META]: true,
    source: event.isTrusted ? 'user' : 'system',
    timestamp: event.timeStamp,
    reason: event.type,
    context,
  };
}
