export type StateAttrMap<State> = {
  [Key in keyof State]?: string;
};

/** Constraint type for core UI classes that compute component state from media state. */
export interface UICore<Props = {}, State extends object = object> {
  getState(state: object): State;
  setProps?(props: Props): void;
  getAttrs?(state: State): object;
}

/** Extracts the media state parameter type from a UICore's `getState` method. */
export type InferMediaState<Core extends UICore> = Core extends { getState(state: infer M): unknown } ? M : never;

/** Extracts the component state return type from a UICore's `getState` method. */
export type InferComponentState<Core extends UICore> = Core extends UICore<unknown, infer S> ? S : never;
