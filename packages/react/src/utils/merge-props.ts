import { isFunction, isUndefined } from '@videojs/utils/predicate';
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
type EventHandler = ((event: SyntheticEvent) => void) | undefined;

function isEventHandler<Value>(key: string, value: Value): value is Value & EventHandler {
  return isEventHandlerKey(key) && (isFunction(value) || isUndefined(value));
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
function mergeOne<T extends ElementType>(merged: Props<T>, props: Props<T> | undefined): Props<T> {
  if (!props) return merged;

  for (const key in props) {
    const value =
      props[
        /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ key as keyof typeof props
      ];

    if (key === 'className') {
      const current = 'className' in merged ? merged.className : undefined;
      Object.assign(merged, {
        className: mergeClassNames(
          /* SAFETY: React's className prop is a string when present. */ current as string | undefined,
          /* SAFETY: React's className prop is a string when present. */ value as string
        ),
      });
    } else if (key === 'style') {
      const current = 'style' in merged ? merged.style : undefined;
      Object.assign(merged, {
        style: mergeStyles(
          /* SAFETY: React's style prop is CSSProperties when present. */ current as CSSProperties | undefined,
          /* SAFETY: React's style prop is CSSProperties when present. */ value as CSSProperties
        ),
      });
    } else if (isEventHandler(key, value)) {
      const current = key in merged ? merged[key] : undefined;
      Object.assign(merged, {
        [key]: mergeEventHandlers(
          /* SAFETY: Event-handler keys carry SyntheticEvent callbacks. */ current as EventHandler,
          value
        ),
      });
    } else {
      Object.assign(merged, { [key]: value });
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
 * @public
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
  let merged = /* SAFETY: Each property is populated from Props<T> values below. */ {} as Props<T>;

  for (const props of propSets) {
    merged = mergeOne(merged, props);
  }

  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ merged as Props<T>;
}
