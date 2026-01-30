import type { StoreApi } from 'zustand';

export type Targets = object;

export type SubscribeFn<T extends Targets> = (
  targets: T,
  update: () => void,
  signal: AbortSignal
) => void | (() => void);

export type ActionsFn<T extends Targets, S extends object, A extends object> = (
  targets: T,
  setState?: StoreApi<S>['setState']
) => A;

export type FeatureConfig<T extends Targets, S extends object, A extends object> = {
  initialState: S;
  getSnapshot?: (targets: T) => S | undefined;
  subscribe?: { [K in keyof T]?: SubscribeFn<T> };
  actions: ActionsFn<T, S, A>;
};

export type FeatureCreator<T extends Targets, S extends object, A extends object> = () => FeatureConfig<T, S, A>;

export type FeatureStore<T extends Targets, S extends object, A extends object> = StoreApi<S & A> & {
  attach: (targets: Partial<{ [K in keyof T]: T[K] | null }>) => void;
};

export type FeatureState<F> = F extends FeatureCreator<any, infer S, any> ? S : never;
export type FeatureActions<F> = F extends FeatureCreator<any, any, infer A> ? A : never;

/** Merged state from a tuple/array of feature creators (Zustand-style slices). */
export type MergeFeatureStates<Creators extends readonly FeatureCreator<any, any, any>[]> = Creators extends readonly [
  infer F,
  ...infer R,
]
  ? F extends FeatureCreator<any, infer S, any>
    ? R extends readonly FeatureCreator<any, any, any>[]
      ? S & MergeFeatureStates<R>
      : S
    : object
  : object;

/** Merged actions from a tuple/array of feature creators (Zustand-style slices). */
export type MergeFeatureActions<Creators extends readonly FeatureCreator<any, any, any>[]> = Creators extends readonly [
  infer F,
  ...infer R,
]
  ? F extends FeatureCreator<any, any, infer A>
    ? R extends readonly FeatureCreator<any, any, any>[]
      ? A & MergeFeatureActions<R>
      : A
    : object
  : object;

/** Infer targets type from an array of feature creators (intersection of all). */
export type InferTargetsFromCreators<Creators extends readonly FeatureCreator<any, any, any>[]> =
  UnionToIntersection<Creators[number] extends FeatureCreator<infer T, any, any> ? T : never> extends infer R
    ? R extends Targets
      ? R
      : object
    : object;

/** Union to intersection helper. */
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
