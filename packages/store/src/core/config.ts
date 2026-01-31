import type { AnyFeature, UnionFeatureTarget } from './feature';
import type { TaskKey } from './queue';
import type { RequestMeta } from './request';
import type { Store } from './store';

export interface PendingTask {
  key: TaskKey;
  meta: RequestMeta | null;
  startedAt: number;
}

export interface StoreConfig<Features extends AnyFeature[]> {
  features: Features;
  onSetup?: (ctx: StoreSetupContext<Features>) => void;
  onAttach?: (ctx: StoreAttachContext<Features>) => void;
  onError?: (ctx: StoreErrorContext<Features>) => void;
  onTaskStart?: (ctx: StoreTaskContext) => void;
  onTaskEnd?: (ctx: StoreTaskContext & { error?: unknown }) => void;
}

export interface StoreSetupContext<Features extends AnyFeature[]> {
  store: Store<Features>;
  signal: AbortSignal;
}

export interface StoreAttachContext<Features extends AnyFeature[]> {
  store: Store<Features>;
  target: UnionFeatureTarget<Features>;
  signal: AbortSignal;
}

export interface StoreErrorContext<Features extends AnyFeature[]> {
  store: Store<Features>;
  error: unknown;
}

export interface StoreTaskContext {
  key: TaskKey;
  meta: RequestMeta | null;
}
