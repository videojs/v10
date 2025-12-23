import type { EventLike } from '@videojs/utils';
import { isObject } from '@videojs/utils';

export const REQUEST_META: unique symbol = Symbol.for('@videojs/request');

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
export function metaFromEvent<Context = unknown>(
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
