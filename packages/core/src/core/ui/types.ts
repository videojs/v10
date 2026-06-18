import type { State } from '@videojs/store';

import type { TranslationKeyOrString } from '../i18n/types';

export type { TranslationKeyOrString };

/** DOM attrs where `aria-label` is a {@link TranslationKeyOrString} resolved by the platform layer. */
export type TranslationAriaLabelAttrs = {
  'aria-label'?: TranslationKeyOrString;
};

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

export interface ButtonState {
  label: TranslationKeyOrString;
}

/** Constraint for media button cores that provide a label derived from state. */
export interface MediaButtonComponent<Props = object, ComponentState extends ButtonState = ButtonState>
  extends MediaUIComponent<Props, ComponentState> {
  readonly state: State<ComponentState>;
  getLabel(state: ComponentState): TranslationKeyOrString;
}

/** Extracts the media state parameter type from a core's `setMedia` method. */
export type InferMediaState<Core extends MediaUIComponent> = Parameters<Core['setMedia']>[0];

/** Extracts the component state return type from a core's `getState` method. */
export type InferComponentState<Core extends UIComponent> = ReturnType<Core['getState']>;
