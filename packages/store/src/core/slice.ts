import type { Simplify, UnionToIntersection } from '@videojs/utils/types';
import type { TaskKey, TaskMode } from './queue';
import type { RequestMeta } from './request';
import type { UnknownState } from './state';

// ----------------------------------------
// Task
// ----------------------------------------

export type Task<Target, State> = {
  <Output>(handler: TaskHandler<Target, State, Output>): Promise<Awaited<Output>>;
  <Output>(options: TaskOptions<Target, State, Output>): Promise<Awaited<Output>>;
};

export interface TaskOptions<Target, State, Output> {
  key?: TaskKey;
  mode?: TaskMode;
  cancels?: TaskKey[];
  handler: TaskHandler<Target, State, Output>;
}

export type TaskHandler<Target, State, Output> = (ctx: TaskContext<Target, State>) => Output;

export interface TaskContext<Target, State> {
  target: Target;
  signal: AbortSignal;
  get: () => Readonly<State>;
  meta: RequestMeta | null;
}

// ----------------------------------------
// Attach
// ----------------------------------------

export type Attach<Target, State> = (ctx: AttachContext<Target, State>) => void;

export interface AttachStore {
  readonly state: UnknownState;
  subscribe: (callback: () => void) => () => void;
}

export interface AttachContext<Target, State> {
  target: Target;
  signal: AbortSignal;
  store: AttachStore;
  get: () => Readonly<State>;
  set: (partial: Partial<State>) => void;
  reportError: (error: unknown) => void;
}

// ----------------------------------------
// State Context
// ----------------------------------------

export interface StateContext<Target> {
  task: Task<Target, UnknownState>;
  target: () => Target;
}

// ----------------------------------------
// Slice
// ----------------------------------------

export interface SliceConfig<Target, State> {
  state: (ctx: StateContext<Target>) => State;
  attach?: (ctx: AttachContext<Target, State>) => void;
}

export type Slice<Target, State> = SliceConfig<Target, State>;

export type AnySlice<Target = any> = Slice<Target, any>;

// ----------------------------------------
// Factory
// ----------------------------------------

export type SliceFactory<Target> = <State>(config: SliceConfig<Target, State>) => Slice<Target, State>;

export function defineSlice<Target>(): SliceFactory<Target> {
  return (config) => config;
}

// ----------------------------------------
// Inference
// ----------------------------------------

export type InferSliceTarget<S> = S extends Slice<infer Target, any> ? Target : never;

export type InferSliceState<S> = S extends Slice<any, infer State> ? State : never;

export type UnionSliceState<Slices extends AnySlice[]> = Simplify<UnionToIntersection<InferSliceState<Slices[number]>>>;
