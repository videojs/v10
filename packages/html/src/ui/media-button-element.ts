import type {
  ButtonState,
  InferComponentState,
  InferMediaState,
  MediaButtonComponent,
  StateAttrMap,
} from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createButton,
  HOTKEY_SHORTCUT_CHANGE_EVENT,
  logMissingFeature,
} from '@videojs/core/dom';
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

  /** Override to match hotkeys that use action values, such as seek steps. */
  protected get hotkeyValue(): number | undefined {
    return undefined;
  }

  get $state(): State<ButtonState> {
    return this.core.state;
  }

  #disconnect: AbortController | null = null;
  #hotkeyRegistry: AriaKeyShortcutsController | null = null;
  #lastHotkeyShortcut: string | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    if (this.hotkeyAction && !this.#hotkeyRegistry) {
      this.#hotkeyRegistry = new AriaKeyShortcutsController(this, this.hotkeyAction, {
        value: () => this.hotkeyValue,
      });
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

  getShortcut(): string | undefined {
    return this.#hotkeyRegistry?.shortcut;
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
      'aria-keyshortcuts': this.#hotkeyRegistry?.aria,
    });
    applyStateDataAttrs(this, state, this.stateAttrMap);
    this.#syncHotkeyShortcut();
  }

  #syncHotkeyShortcut(): void {
    const shortcut = this.getShortcut();

    if (shortcut === this.#lastHotkeyShortcut) return;

    this.#lastHotkeyShortcut = shortcut;
    this.dispatchEvent(new CustomEvent(HOTKEY_SHORTCUT_CHANGE_EVENT));
  }
}
