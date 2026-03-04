export type StateAttrMap<State> = {
  [Key in keyof State]?: string;
};

export interface UICore<Props = {}, State extends object = object> {
  getState(state: object): State;
  setProps?(props: Props): void;
  getAttrs?(state: State): object;
}

export type InferMediaState<Core extends UICore> = Core extends { getState(state: infer M): unknown } ? M : never;

export type InferComponentState<Core extends UICore> = Core extends UICore<unknown, infer S> ? S : never;

export type InferComponentProps<Core extends UICore> = Core extends UICore<infer P> ? P : never;
