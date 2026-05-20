import type { StateAttrMap } from './types';

/** Phase of an open/close transition. */
export type TransitionStatus = 'idle' | 'starting' | 'ending';

/** Logical and lifecycle state of an element with open/close transitions. */
export interface TransitionState {
  /** Whether the element is logically active (stays `true` during ending animations). */
  active: boolean;
  /** Current phase of the transition lifecycle. */
  status: TransitionStatus;
}

/** Boolean flags derived from `TransitionStatus`, mixed into component state. */
export interface TransitionFlags {
  /** Whether the open transition is in progress. */
  transitionStarting: boolean;
  /** Whether the close transition is in progress. */
  transitionEnding: boolean;
}

/** Concrete data attributes reflected from {@link TransitionFlags}. */
export interface TransitionStyleAttrs {
  /** Present at the start of an enter transition. */
  'data-starting-style'?: '' | undefined;
  /** Present at the start of an exit transition. */
  'data-ending-style'?: '' | undefined;
}

/** Shared data attributes for open/close transition state. Spread into component data-attrs objects. */
export const TransitionDataAttrs = {
  /** Present during the open transition. */
  transitionStarting: 'data-starting-style',
  /** Present during the close transition. */
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<TransitionFlags>;

/**
 * Project a `TransitionStatus` value to boolean flags for component state.
 *
 * @param status - Current transition status.
 */
export function getTransitionFlags(status: TransitionStatus): TransitionFlags {
  return {
    transitionStarting: status === 'starting',
    transitionEnding: status === 'ending',
  };
}

/**
 * Build the concrete data-attribute object for an element from transition flags.
 *
 * @param flags - Boolean transition flags.
 */
export function getTransitionStyleAttrs({
  transitionStarting,
  transitionEnding,
}: TransitionFlags): TransitionStyleAttrs {
  return {
    [TransitionDataAttrs.transitionStarting]: transitionStarting ? '' : undefined,
    [TransitionDataAttrs.transitionEnding]: transitionEnding ? '' : undefined,
  };
}
