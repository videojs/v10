import type { AnyFeature, UnionFeatureState, UnionFeatureTarget } from './feature';
import type { TaskKey } from './queue';
import type { RequestMeta } from './request';
import type { Store } from './store';

export interface PendingTask {
  key: TaskKey;
  meta: RequestMeta | null;
  startedAt: number;
}

export interface StoreConfig<Features extends AnyFeature[]>
  extends StoreCallbacks<UnionFeatureTarget<Features>, UnionFeatureState<Features>> {
  features: Features;
}

export interface StoreCallbacks<Target, State> {
  onSetup?: (ctx: StoreSetupContext<Target, State>) => void;
  onAttach?: (ctx: StoreAttachContext<Target, State>) => void;
  onError?: (ctx: StoreErrorContext<Target, State>) => void;
  onTaskStart?: (ctx: StoreTaskContext) => void;
  onTaskEnd?: (ctx: StoreTaskContext & { error?: unknown }) => void;
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

export interface StoreTaskContext {
  key: TaskKey;
  meta: RequestMeta | null;
}
