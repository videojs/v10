import type { StoreApi } from './core-store';

export type Targets = object;

export type SubscribeFn<T extends Targets> = (
  targets: T,
  update: () => void,
  signal: AbortSignal
) => void | (() => void);

export type ActionsFn<T extends Targets, S extends object, A extends object> = (
  targets: T,
  set: StoreApi<S>['setState']
) => A;

export type FeatureConfig<T extends Targets, S extends object, A extends object> = {
  initialState: S;
  getSnapshot?: (targets: T) => S | undefined;
  subscribe?: { [K in keyof T]?: SubscribeFn<T> };
  actions: ActionsFn<T, S, A>;
};

export type FeatureCreatorFn<T extends Targets, S extends object, A extends object> = () => FeatureConfig<T, S, A>;

/** Use with `satisfies FeatureCreator<T>` so only Targets (T) is required; S and A stay inferred. */
export type FeatureCreator<T extends Targets> = () => FeatureConfig<T, object, object>;

export type FeatureStore<T extends Targets, S extends object, A extends object> = StoreApi<S & A> & {
  attach: (targets: Partial<{ [K in keyof T]: T[K] | null }>) => void;
};

type FeatureCreatorOrConfig = FeatureCreatorFn<any, any, any> | { initialState: any; actions: (...args: any[]) => any };

type ExtractStateFromCreator<F> = F extends () => { initialState: infer S }
  ? S
  : F extends { initialState: infer S }
    ? S
    : object;
type ExtractActionsFromCreator<F> = F extends () => { actions: (...args: any[]) => infer A }
  ? A
  : F extends { actions: (...args: any[]) => infer A }
    ? A
    : object;

export type FeatureState<F> = ExtractStateFromCreator<F> extends object ? ExtractStateFromCreator<F> : never;
export type FeatureActions<F> = ExtractActionsFromCreator<F> extends object ? ExtractActionsFromCreator<F> : never;

export type MergeFeatureStates<Creators extends readonly FeatureCreatorOrConfig[]> = Creators extends readonly [
  infer F,
  ...infer R,
]
  ? ExtractStateFromCreator<F> & (R extends readonly FeatureCreatorOrConfig[] ? MergeFeatureStates<R> : object)
  : object;

export type MergeFeatureActions<Creators extends readonly FeatureCreatorOrConfig[]> = Creators extends readonly [
  infer F,
  ...infer R,
]
  ? ExtractActionsFromCreator<F> & (R extends readonly FeatureCreatorOrConfig[] ? MergeFeatureActions<R> : object)
  : object;

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type InferTargetsFromCreators<Creators extends readonly FeatureCreatorFn<any, any, any>[]> =
  UnionToIntersection<Creators[number] extends FeatureCreatorFn<infer T, any, any> ? T : never> extends infer R
    ? R extends Targets
      ? R
      : object
    : object;
