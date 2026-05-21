import type { StateAttrMap } from './types';

export type TransitionStatus = 'idle' | 'starting' | 'ending';

export interface TransitionState {
  /** Whether the element is logically active (stays `true` during ending animations). */
  active: boolean;
  /** Current phase of the transition lifecycle. */
  status: TransitionStatus;
  /** Whether an open or close animation is currently running. */
  transitioning: boolean;
}

export interface TransitionFlags {
  /** Whether an open or close animation is currently running. */
  transitioning: boolean;
  /** Whether the open transition is in progress. */
  transitionStarting: boolean;
  /** Whether the close transition is in progress. */
  transitionEnding: boolean;
}

export interface TransitionStyleAttrs {
  'data-transitioning'?: '' | undefined;
  'data-starting-style'?: '' | undefined;
  'data-ending-style'?: '' | undefined;
}

export type TransitionStyleFlags = Omit<TransitionFlags, 'transitioning'> & {
  transitioning?: boolean | undefined;
};

/** Shared data attributes for open/close transition state. Spread into component data-attrs objects. */
export const TransitionDataAttrs = {
  /** Present while an open or close animation is running. */
  transitioning: 'data-transitioning',
  /** Present during the open transition. */
  transitionStarting: 'data-starting-style',
  /** Present during the close transition. */
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<TransitionFlags>;

export function getTransitionFlags(status: TransitionStatus, transitioning = status !== 'idle'): TransitionFlags {
  return {
    transitioning,
    transitionStarting: status === 'starting',
    transitionEnding: status === 'ending',
  };
}

export function getTransitionStyleAttrs({
  transitioning = false,
  transitionStarting,
  transitionEnding,
}: TransitionStyleFlags): TransitionStyleAttrs {
  return {
    [TransitionDataAttrs.transitioning]: transitioning ? '' : undefined,
    [TransitionDataAttrs.transitionStarting]: transitionStarting ? '' : undefined,
    [TransitionDataAttrs.transitionEnding]: transitionEnding ? '' : undefined,
  };
}
