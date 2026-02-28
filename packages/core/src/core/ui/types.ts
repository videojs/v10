export type StateAttrMap<State> = {
  [Key in keyof State]?: string;
};

export type TransitionStatus = 'idle' | 'starting' | 'ending';

export interface TransitionState {
  open: boolean;
  status: TransitionStatus;
}
