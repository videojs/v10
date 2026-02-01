import { isObject } from '@videojs/utils/predicate';
import type { Simplify, UnionToIntersection } from '@videojs/utils/types';
import type { TaskKey, TaskMode } from './queue';
import type { RequestMeta } from './request';

const FEATURE_SYMBOL = Symbol('@videojs/feature');

// ----------------------------------------
// Task
// ----------------------------------------

export type Task<Target, State extends object> = {
  <Output>(handler: TaskHandler<Target, State, Output>): Promise<Awaited<Output>>;
  <Output>(options: TaskOptions<Target, State, Output>): Promise<Awaited<Output>>;
};

export interface TaskOptions<Target, State extends object, Output> {
  key?: TaskKey;
  mode?: TaskMode;
  cancels?: TaskKey[];
  handler: TaskHandler<Target, State, Output>;
}

export type TaskHandler<Target, State extends object, Output> = (ctx: TaskContext<Target, State>) => Output;

export interface TaskContext<Target, State extends object> {
  target: Target;
  signal: AbortSignal;
  get: () => Readonly<State>;
  meta: RequestMeta | null;
}

// ----------------------------------------
// Attach
// ----------------------------------------

export type Attach<Target, State extends object> = (ctx: AttachContext<Target, State>) => void;

export interface AttachContext<Target, State extends object> {
  target: Target;
  signal: AbortSignal;
  get: () => Readonly<State>;
  set: (partial: Partial<State>) => void;
}

// ----------------------------------------
// Feature Context
// ----------------------------------------

/** Context passed to state factory - uses loose types to enable State inference. */
export interface StateFactoryContext<Target> {
  task: Task<Target, any>;
  target: () => Target;
}

// ----------------------------------------
// Feature
// ----------------------------------------

export type StateFactory<Target, State extends object> = (ctx: StateFactoryContext<Target>) => State;

export interface FeatureConfig<Target, State extends object> {
  state: StateFactory<Target, State>;
  attach?: Attach<Target, State>;
}

export interface Feature<Target, State extends object> extends FeatureConfig<Target, State> {
  [FEATURE_SYMBOL]: true;
}

export type AnyFeature<Target = any> = Feature<Target, any>;

// ----------------------------------------
// Factory
// ----------------------------------------

export function defineFeature<Target>(): <State extends object>(
  config: FeatureConfig<Target, State>
) => Feature<Target, State> {
  return <State extends object>(config: FeatureConfig<Target, State>): Feature<Target, State> => ({
    [FEATURE_SYMBOL]: true,
    ...config,
  });
}

export function isFeature(value: unknown): value is AnyFeature {
  return isObject(value) && FEATURE_SYMBOL in value;
}

// ----------------------------------------
// Inference
// ----------------------------------------

export type InferFeatureTarget<F> = F extends Feature<infer Target, any> ? Target : never;

export type InferFeatureState<F> = F extends Feature<any, infer State> ? State : never;

export type UnionFeatureTarget<Features extends AnyFeature[]> = InferFeatureTarget<Features[number]>;

export type UnionFeatureState<Features extends AnyFeature[]> = Simplify<
  UnionToIntersection<InferFeatureState<Features[number]>>
>;
