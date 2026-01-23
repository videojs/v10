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

export type AnyFeature<Target = any> = Feature<Target, any, any>;

export interface Feature<Target, State extends object, Requests extends { [K in keyof Requests]: Request<any, any> }> {
  readonly id: symbol;
  readonly initialState: State;
  readonly getSnapshot: FeatureGetSnapshot<Target, State>;
  readonly subscribe: FeatureSubscribe<Target, State>;
  readonly request: ResolvedRequestConfigMap<Target, Requests>;
}

export type FeatureGetSnapshot<Target, State> = (ctx: FeatureGetSnapshotContext<Target, State>) => State;

export interface FeatureGetSnapshotContext<Target, State> {
  target: Target;
  initialState: State;
}

export type FeatureSubscribe<Target, State extends object> = (ctx: FeatureSubscribeContext<Target, State>) => void;

export interface FeatureSubscribeContext<Target, _State extends object> {
  target: Target;
  update: FeatureUpdate;
  signal: AbortSignal;
}

/** Sync feature state from target via getSnapshot. */
export type FeatureUpdate = () => void;

export interface FeatureConfig<
  Target,
  State extends object,
  Requests extends { [K in keyof Requests]: Request<any, any> },
> {
  initialState: State;
  getSnapshot: FeatureGetSnapshot<Target, State>;
  subscribe: FeatureSubscribe<Target, State>;
  request: RequestConfigMap<Target, Requests>;
}

// ----------------------------------------
// Type Inference
// ----------------------------------------

export type InferFeatureTarget<S> = S extends Feature<infer T, any, any> ? T : never;

export type InferFeatureState<S> = S extends Feature<any, infer State, any> ? State : never;

export type InferFeatureRequests<S> = S extends Feature<any, any, infer R> ? { [K in keyof R]: R[K] } : never;

export type ResolveFeatureRequestHandlers<S> =
  S extends Feature<any, any, infer R> ? { [K in keyof R]: ResolveRequestHandler<R[K]> } : never;

export type UnionFeatureTarget<Features extends AnyFeature[]> = InferFeatureTarget<Features[number]>;

export type UnionFeatureState<Features extends Feature<any, any, any>[]> = UnionToIntersection<
  InferFeatureState<Features[number]>
>;

export type UnionFeatureRequests<Features extends Feature<any, any, any>[]> = UnionToIntersection<
  ResolveFeatureRequestHandlers<Features[number]>
>;

export type UnionFeatureTasks<Features extends Feature<any, any, any>[]> = EnsureTaskRecord<
  UnionToIntersection<InferFeatureRequests<Features[number]>>
>;

// ----------------------------------------
// createFeature
// ----------------------------------------

export type FeatureFactory<Target> = <
  State extends object,
  const Requests extends Record<string, RequestHandler<Target, any, any> | RequestConfig<Target, any, any>>,
>(config: {
  initialState: State;
  getSnapshot: (ctx: FeatureGetSnapshotContext<Target, State>) => State;
  subscribe: (ctx: FeatureSubscribeContext<Target, State>) => void;
  request: Requests;
}) => Feature<Target, State, ResolveRequestMap<Requests>>;

export type FeatureFactoryResult<Target, Config> = Config extends {
  initialState: infer S extends object;
  request: infer R;
}
  ? Feature<Target, S, ResolveRequestMap<R>>
  : never;

/**
 * Create a feature for a target type.
 *
 * @example
 * // Curried form - infers state and requests from config
 * const audioFeature = createFeature<HTMLVideoElement>()({
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
 * const audioFeature = createFeature<HTMLVideoElement, AudioState, AudioRequests>({...});
 */
export function createFeature<Target>(): FeatureFactory<Target>;

export function createFeature<
  Target,
  State extends object,
  Requests extends { [K in keyof Requests]: Request<any, any> },
>(config: FeatureConfig<Target, State, Requests>): Feature<Target, State, Requests>;

export function createFeature<
  Target,
  State extends object = any,
  Requests extends { [K in keyof Requests]: Request<any, any> } = any,
>(config?: FeatureConfig<Target, State, Requests>): Feature<Target, State, Requests> | FeatureFactory<Target> {
  if (arguments.length === 0) {
    return (<
      S extends object,
      const R extends Record<string, RequestHandler<Target, any, any> | RequestConfig<Target, any, any>>,
    >(config: {
      initialState: S;
      getSnapshot: (ctx: FeatureGetSnapshotContext<Target, S>) => S;
      subscribe: (ctx: FeatureSubscribeContext<Target, S>) => void;
      request: R;
    }) => _createFeature(config)) as FeatureFactory<Target>;
  }

  return _createFeature(config!);
}

function _createFeature<Target, State extends object, Requests extends { [K in keyof Requests]: Request<any, any> }>(
  config: FeatureConfig<Target, State, Requests>
): Feature<Target, State, Requests> {
  return {
    id: Symbol('@videojs/feature'),
    ...config,
    request: resolveRequests(config.request),
  };
}
