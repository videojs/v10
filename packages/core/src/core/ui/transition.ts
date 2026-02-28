export type TransitionStatus = 'idle' | 'starting' | 'ending';

export interface TransitionState {
  /** Whether the element is logically open (stays `true` during close animations). */
  open: boolean;
  /** Current phase of the open/close animation lifecycle. */
  status: TransitionStatus;
}

export interface TransitionFlags {
  /** Whether the open transition is in progress. */
  transitionStarting: boolean;
  /** Whether the close transition is in progress. */
  transitionEnding: boolean;
}

export function getTransitionFlags(status: TransitionStatus): TransitionFlags {
  return {
    transitionStarting: status === 'starting',
    transitionEnding: status === 'ending',
  };
}
