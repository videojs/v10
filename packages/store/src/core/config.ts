import type { Store } from './store';

export interface StoreCallbacks<Target, State> {
  onSetup?: (ctx: StoreSetupContext<Target, State>) => void;
  onAttach?: (ctx: StoreAttachContext<Target, State>) => void;
  onError?: (ctx: StoreErrorContext<Target, State>) => void;
}

export interface StoreSetupContext<Target, State> {
  store: Store<Target, State>;
  signal: AbortSignal;
}

export interface StoreAttachContext<Target, State> {
  store: Store<Target, State>;
  target: Target;
  signal: AbortSignal;
}

export interface StoreErrorContext<Target, State> {
  store: Store<Target, State>;
  error: unknown;
}
