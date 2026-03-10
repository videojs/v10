export type StateAttrMap<State> = {
  [Key in keyof State]?: string;
};

/** Constraint for core UI classes that compute component state. */
export interface UIComponent<Props = object, State extends object = object> {
  getState(): State;
  setProps?(props: Props): void;
  getAttrs?(state: State): object;
}

/** Constraint for core UI classes that derive component state from media state. */
export interface MediaUIComponent<Props = object, State extends object = object> extends UIComponent<Props, State> {
  setMedia(media: object): void;
}

/** Extracts the media state parameter type from a core's `setMedia` method. */
export type InferMediaState<Core extends MediaUIComponent> = Parameters<Core['setMedia']>[0];

/** Extracts the component state return type from a core's `getState` method. */
export type InferComponentState<Core extends UIComponent> = ReturnType<Core['getState']>;
