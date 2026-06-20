import type { HotkeyProps } from '@videojs/core';
import { createHotkey, isHotkeyToggleAction, resolveHotkeyAction } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { containerContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class HotkeyElement extends MediaElement {
  static readonly tagName = 'media-hotkey';

  static override properties: PropertyDeclarationMap = {
    keys: { type: String },
    action: { type: String },
    value: { type: Number },
    disabled: { type: Boolean },
    target: { type: String },
  };

  keys: HotkeyProps['keys'] = '';
  action: HotkeyProps['action'] = '';
  value: HotkeyProps['value'] = undefined;
  disabled = false;
  target: NonNullable<HotkeyProps['target']> = 'player';

  readonly #player = new PlayerController(this, playerContext);
  readonly #container = new ContextConsumer(this, {
    context: containerContext,
    callback: () => this.requestUpdate(),
    subscribe: true,
  });
  #cleanup: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'none';
    this.#register();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unregister();
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    // Re-register when attributes change.
    if (this.isConnected) {
      this.#unregister();
      this.#register();
    }
  }

  #register(): void {
    const store = this.#player.value;
    const container = this.#container.value?.container;
    if (!this.keys || !this.action || !store || !container) return;

    const resolver = resolveHotkeyAction(this.action);
    if (!resolver) return;

    const { value, action } = this;

    this.#cleanup = createHotkey(container, {
      keys: this.keys,
      action,
      value,
      target: this.target,
      disabled: this.disabled,
      repeatable: !isHotkeyToggleAction(action),
      onActivate: (_event, key) => {
        resolver({ store, key, value });
      },
    });
  }

  #unregister(): void {
    this.#cleanup?.();
    this.#cleanup = null;
  }
}
