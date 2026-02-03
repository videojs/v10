'use client';

import type { ComponentPropsWithRef, CSSProperties, ElementType, SyntheticEvent } from 'react';

type Props<T extends ElementType = ElementType> = ComponentPropsWithRef<T>;

/**
 * Check if a key is an event handler key (on* with capital letter).
 */
function isEventHandlerKey(key: string): boolean {
  return (
    key.charCodeAt(0) === 111 /* o */ &&
    key.charCodeAt(1) === 110 /* n */ &&
    key.charCodeAt(2) >= 65 /* A */ &&
    key.charCodeAt(2) <= 90 /* Z */
  );
}

/**
 * Check if a key/value pair is an event handler (includes undefined values).
 */
function isEventHandler(key: string, value: unknown): boolean {
  return isEventHandlerKey(key) && (typeof value === 'function' || typeof value === 'undefined');
}

/**
 * Merge two event handlers - external runs first, ours runs second.
 */
function mergeEventHandlers(
  ours: ((event: SyntheticEvent) => void) | undefined,
  theirs: ((event: SyntheticEvent) => void) | undefined
): ((event: SyntheticEvent) => void) | undefined {
  if (!theirs) return ours;
  if (!ours) return theirs;

  return (event: SyntheticEvent) => {
    theirs(event);
    ours(event);
  };
}

/**
 * Merge two className values - concatenate strings.
 */
function mergeClassNames(ours: string | undefined, theirs: string | undefined): string | undefined {
  if (theirs && ours) return `${theirs} ${ours}`;
  return theirs || ours;
}

/**
 * Merge two style objects - theirs overwrites conflicts.
 */
function mergeStyles(ours: CSSProperties | undefined, theirs: CSSProperties | undefined): CSSProperties | undefined {
  if (!theirs) return ours;
  if (!ours) return theirs;
  return { ...ours, ...theirs };
}

/**
 * Merge a single props object into accumulated result.
 */
function mergeOne<T extends ElementType>(
  merged: Record<string, unknown>,
  props: Props<T> | undefined
): Record<string, unknown> {
  if (!props) return merged;

  for (const key in props) {
    const value = props[key as keyof typeof props];

    if (key === 'className') {
      merged.className = mergeClassNames(merged.className as string | undefined, value as string);
    } else if (key === 'style') {
      merged.style = mergeStyles(merged.style as CSSProperties | undefined, value as CSSProperties);
    } else if (isEventHandler(key, value)) {
      merged[key] = mergeEventHandlers(
        merged[key] as ((event: SyntheticEvent) => void) | undefined,
        value as (event: SyntheticEvent) => void
      );
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Merge multiple props objects.
 *
 * - Event handlers (on*): chained - external first, ours second
 * - className: concatenated
 * - style: merged objects (external wins conflicts)
 * - other: last one wins
 *
 * @example
 * ```ts
 * const merged = mergeProps(
 *   { onClick: ourHandler, className: 'base' },
 *   { onClick: theirHandler, className: 'custom' }
 * );
 * // { onClick: chainedHandler, className: 'custom base' }
 * ```
 */
export function mergeProps<T extends ElementType>(...propSets: (Props<T> | undefined)[]): Props<T> {
  let merged: Record<string, unknown> = {};

  for (const props of propSets) {
    merged = mergeOne(merged, props);
  }

  return merged as Props<T>;
}
