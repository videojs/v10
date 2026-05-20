import { createHotkey, type HotkeyActionName, isHotkeyToggleAction, resolveHotkeyAction } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { containerContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

/** Custom element shell for the `<media-hotkey>` tag — declarative keyboard shortcut bound to a player action. */
export class HotkeyElement extends MediaElement {
  /** Custom element tag name. */
  static readonly tagName = 'media-hotkey';

  static override properties: PropertyDeclarationMap = {
    keys: { type: String },
    action: { type: String },
    value: { type: Number },
    disabled: { type: Boolean },
    target: { type: String },
  };

  /** Key combination(s) that trigger the hotkey (e.g., `"Space"`, `"k"`, `"0-9"`). */
  keys = '';
  /** Player action name to invoke when the shortcut fires. */
  action: HotkeyActionName | (string & {}) = '';
  /** Optional numeric argument passed to the action (e.g., seconds for `seekStep`). */
  value: number | undefined = undefined;
  /** Disables the hotkey when true. */
  disabled = false;
  /** Where the listener attaches — the player container (default) or the document. */
  target: 'player' | 'document' = 'player';

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
