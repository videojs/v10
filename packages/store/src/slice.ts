import type { InferRequestHandler, InferRequests, Request, RequestsConfig, ResolvedRequests } from './request';
import { resolveRequests } from './request';

// ----------------------------------------
// Types
// ----------------------------------------

export interface Slice<Target, State extends object, Requests extends { [K in keyof Requests]: Request<any, any> }> {
  readonly id: symbol;
  readonly initialState: State;
  readonly getSnapshot: SliceGetSnapshot<Target, State>;
  readonly subscribe: SliceSubscribe<Target, State>;
  readonly request: ResolvedRequests<Target, Requests>;
}

export type SliceGetSnapshot<Target, State> = (ctx: {
  target: Target;
  initialState: State;
}) => State;

export type SliceSubscribe<Target, State extends object> = (ctx: {
  target: Target;
  update: SliceUpdate<State>;
  signal: AbortSignal;
}) => void;

export interface SliceUpdate<State extends object> {
  (): void;
  (state: Partial<State>): void;
}

export interface SliceConfig<Target, State extends object, Requests extends { [K in keyof Requests]: Request<any, any> }> {
  initialState: State;
  getSnapshot: SliceGetSnapshot<Target, State>;
  subscribe: SliceSubscribe<Target, State>;
  request: RequestsConfig<Target, Requests>;
}

// ----------------------------------------
// Type Inference
// ----------------------------------------

export type InferSlice<Target, Config> = Config extends {
  initialState: infer S extends object;
  request: infer R;
}
  ? Slice<Target, S, InferRequests<Target, R>>
  : never;

export type InferSliceTarget<S> = S extends Slice<infer T, any, any> ? T : never;

export type InferSliceState<S> = S extends Slice<any, infer State, any> ? State : never;

export type InferSliceRequests<S> = S extends Slice<any, any, infer R>
  ? { [K in keyof R]: InferRequestHandler<R[K]> }
  : never;

export type InferSliceTaskTypes<S> = S extends Slice<any, any, infer R>
  ? { [K in keyof R & string]: R[K] extends Request<infer I, infer O> ? { input: I; output: O } : never }
  : never;

// ----------------------------------------
// createSlice
// ----------------------------------------

export interface SliceFactory<Target> {
  <const C extends {
    initialState: object;
    getSnapshot: (ctx: { target: Target; initialState: any }) => any;
    subscribe: (ctx: { target: Target; update: any; signal: AbortSignal }) => void;
    request: Record<string, ((...args: any[]) => any) | { handler: (...args: any[]) => any }>;
  }>(config: C): InferSlice<Target, C>;
}

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
>(
  config?: SliceConfig<Target, State, Requests>,
): Slice<Target, State, Requests> | SliceFactory<Target> {
  if (arguments.length === 0) {
    return (config => _createSlice(config)) as SliceFactory<Target>;
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
