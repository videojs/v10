import type { State } from '@videojs/store';

/** Map of state keys to their reflected data-attribute names. */
export type StateAttrMap<State> = {
  [Key in keyof State]?: string;
};

/** Constraint for core UI classes that compute component state. */
export interface UIComponent<Props = object, State extends object = object> {
  /** Recompute and return the current state. */
  getState(): State;
  /** Update props on the core. */
  setProps?(props: Props): void;
  /** Compute attributes (typically ARIA) from state. */
  getAttrs?(state: State): object;
}

/** Constraint for core UI classes that derive component state from media state. */
export interface MediaUIComponent<Props = object, State extends object = object> extends UIComponent<Props, State> {
  /** Bind the core to a media state source. */
  setMedia(media: object): void;
}

/** Shared state shape for media button cores. */
export interface ButtonState {
  /** Current ARIA label for the button. */
  label: string;
}

/** Constraint for media button cores that provide a label derived from state. */
export interface MediaButtonComponent<Props = object, ComponentState extends ButtonState = ButtonState>
  extends MediaUIComponent<Props, ComponentState> {
  /** Reactive state container. */
  readonly state: State<ComponentState>;
  /** Resolve the button's ARIA label from props and state. */
  getLabel(state: ComponentState): string;
}

/** Extracts the media state parameter type from a core's `setMedia` method. */
export type InferMediaState<Core extends MediaUIComponent> = Parameters<Core['setMedia']>[0];

/** Extracts the component state return type from a core's `getState` method. */
export type InferComponentState<Core extends UIComponent> = ReturnType<Core['getState']>;
