import type {
  ButtonState,
  InferComponentState,
  InferMediaState,
  MediaButtonComponent,
  StateAttrMap,
} from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, createButton, logMissingFeature } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import type { State } from '@videojs/store';

import type { PlayerController } from '../player/player-controller';
import { AriaKeyShortcutsController } from './hotkey/aria-key-shortcuts-controller';
import { MediaElement } from './media-element';

/** Abstract base for HTML custom elements that render a media-control button. */
export abstract class MediaButtonElement<Core extends MediaButtonComponent> extends MediaElement {
  static override properties: PropertyDeclarationMap = {
    label: { type: String },
    disabled: { type: Boolean },
  };

  disabled = false;
  label = '';

  protected abstract readonly core: Core;
  protected abstract readonly stateAttrMap: StateAttrMap<InferComponentState<Core>>;
  protected abstract readonly mediaState: PlayerController<any, InferMediaState<Core> | undefined>;

  protected abstract activate(state: InferMediaState<Core>): void;

  /** Override to set the hotkey action name for `aria-keyshortcuts`. */
  protected readonly hotkeyAction: string | undefined = undefined;

  get $state(): State<ButtonState> {
    return this.core.state;
  }

  #disconnect: AbortController | null = null;
  #hotkeyRegistry: AriaKeyShortcutsController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.hotkeyAction && !this.#hotkeyRegistry) {
      this.#hotkeyRegistry = new AriaKeyShortcutsController(this, this.hotkeyAction);
    }

    this.#disconnect = new AbortController();

    const buttonProps = createButton({
      onActivate: () => this.activate(this.mediaState.value!),
      isDisabled: () => this.disabled || !this.mediaState.value,
    });

    applyElementProps(this, buttonProps, { signal: this.#disconnect.signal });

    if (__DEV__ && !this.mediaState.value && this.mediaState.displayName) {
      logMissingFeature(this.localName, this.mediaState.displayName);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  /** Returns the button's current label derived from media state. */
  getLabel(): string | undefined {
    return this.core.state.current.label || undefined;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.core.setProps?.(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.mediaState.value;

    if (!media) return;

    this.core.setMedia(media);
    const state = this.core.getState();
    applyElementProps(this, {
      ...this.core.getAttrs?.(state),
      'aria-keyshortcuts': this.#hotkeyRegistry?.value,
    });
    applyStateDataAttrs(this, state, this.stateAttrMap);
  }
}
