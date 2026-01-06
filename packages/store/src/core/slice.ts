import type { UnionToIntersection } from '@videojs/utils/types';
import type { EnsureTaskRecord } from './queue';
import type {
  Request,
  RequestConfig,
  RequestConfigMap,
  RequestHandler,
  ResolvedRequestConfigMap,
  ResolveRequestHandler,
  ResolveRequestMap,
} from './request';

import { resolveRequests } from './request';

// ----------------------------------------
// Types
// ----------------------------------------

export type AnySlice<Target = any> = Slice<Target, any, any>;

export interface Slice<Target, State extends object, Requests extends { [K in keyof Requests]: Request<any, any> }> {
  readonly id: symbol;
  readonly initialState: State;
  readonly getSnapshot: SliceGetSnapshot<Target, State>;
  readonly subscribe: SliceSubscribe<Target, State>;
  readonly request: ResolvedRequestConfigMap<Target, Requests>;
}

export type SliceGetSnapshot<Target, State> = (ctx: SliceGetSnapshotContext<Target, State>) => State;

export interface SliceGetSnapshotContext<Target, State> {
  target: Target;
  initialState: State;
}

export type SliceSubscribe<Target, State extends object> = (ctx: SliceSubscribeContext<Target, State>) => void;

export interface SliceSubscribeContext<Target, _State extends object> {
  target: Target;
  update: SliceUpdate;
  signal: AbortSignal;
}

/** Sync slice state from target via getSnapshot. */
export type SliceUpdate = () => void;

export interface SliceConfig<
  Target,
  State extends object,
  Requests extends { [K in keyof Requests]: Request<any, any> },
> {
  initialState: State;
  getSnapshot: SliceGetSnapshot<Target, State>;
  subscribe: SliceSubscribe<Target, State>;
  request: RequestConfigMap<Target, Requests>;
}

// ----------------------------------------
// Type Inference
// ----------------------------------------

export type InferSliceTarget<S> = S extends Slice<infer T, any, any> ? T : never;

export type InferSliceState<S> = S extends Slice<any, infer State, any> ? State : never;

export type InferSliceRequests<S> = S extends Slice<any, any, infer R> ? { [K in keyof R]: R[K] } : never;

export type ResolveSliceRequestHandlers<S>
  = S extends Slice<any, any, infer R> ? { [K in keyof R]: ResolveRequestHandler<R[K]> } : never;

export type UnionSliceTarget<Slices extends AnySlice[]> = InferSliceTarget<Slices[number]>;

export type UnionSliceState<Slices extends Slice<any, any, any>[]> = UnionToIntersection<
  InferSliceState<Slices[number]>
>;

export type UnionSliceRequests<Slices extends Slice<any, any, any>[]> = UnionToIntersection<
  ResolveSliceRequestHandlers<Slices[number]>
>;

export type UnionSliceTasks<Slices extends Slice<any, any, any>[]> = EnsureTaskRecord<
  UnionToIntersection<InferSliceRequests<Slices[number]>>
>;

// ----------------------------------------
// createSlice
// ----------------------------------------

export interface SliceFactory<Target> {
  <
    State extends object,
    const Requests extends Record<string, RequestHandler<Target, any, any> | RequestConfig<Target, any, any>>,
  >(config: {
    initialState: State;
    getSnapshot: (ctx: SliceGetSnapshotContext<Target, State>) => State;
    subscribe: (ctx: SliceSubscribeContext<Target, State>) => void;
    request: Requests;
  }): Slice<Target, State, ResolveRequestMap<Requests>>;
}

export type SliceFactoryResult<Target, Config> = Config extends {
  initialState: infer S extends object;
  request: infer R;
}
  ? Slice<Target, S, ResolveRequestMap<R>>
  : never;

/**
 * Create a slice for a target type.
 *
 * @example
 * // Curried form - infers state and requests from config
 * const audioSlice = createSlice<HTMLVideoElement>()({
 *   ...
 * });
 *
 * @example
 * // Explicit types
 * interface AudioState {
 *   volume: number;
 *   muted: boolean
 * }
 *
 * interface AudioRequests {
 *   setVolume: Request<number>;
 *   setMuted: Request<boolean>;
 * }
 * const audioSlice = createSlice<HTMLVideoElement, AudioState, AudioRequests>({...});
 */
export function createSlice<Target>(): SliceFactory<Target>;

export function createSlice<
  Target,
  State extends object,
  Requests extends { [K in keyof Requests]: Request<any, any> },
>(config: SliceConfig<Target, State, Requests>): Slice<Target, State, Requests>;

export function createSlice<
  Target,
  State extends object = any,
  Requests extends { [K in keyof Requests]: Request<any, any> } = any,
>(config?: SliceConfig<Target, State, Requests>): Slice<Target, State, Requests> | SliceFactory<Target> {
  if (arguments.length === 0) {
    return (<
      S extends object,
      const R extends Record<string, RequestHandler<Target, any, any> | RequestConfig<Target, any, any>>,
    >(config: {
      initialState: S;
      getSnapshot: (ctx: SliceGetSnapshotContext<Target, S>) => S;
      subscribe: (ctx: SliceSubscribeContext<Target, S>) => void;
      request: R;
    }) => _createSlice(config)) as SliceFactory<Target>;
  }

  return _createSlice(config!);
}

function _createSlice<Target, State extends object, Requests extends { [K in keyof Requests]: Request<any, any> }>(
  config: SliceConfig<Target, State, Requests>,
): Slice<Target, State, Requests> {
  return {
    id: Symbol('@videojs/slice'),
    ...config,
    request: resolveRequests(config.request),
  };
}
