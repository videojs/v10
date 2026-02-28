export type StateAttrMap<State> = {
  [Key in keyof State]?: string;
};

export type TransitionStatus = 'idle' | 'starting' | 'ending';

export interface TransitionState {
  /** Whether the element is logically open (stays `true` during close animations). */
  open: boolean;
  /** Current phase of the open/close animation lifecycle. */
  status: TransitionStatus;
}
