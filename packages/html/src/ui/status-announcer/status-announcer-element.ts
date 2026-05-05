import { StatusAnnouncerCore } from '@videojs/core';
import { getMediaSnapshot, subscribeToInputActions } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { containerContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class StatusAnnouncerElement extends MediaElement {
  static readonly tagName = 'media-status-announcer';

  static override properties = {
    closeDelay: { type: Number, attribute: 'close-delay' },
  } satisfies PropertyDeclarationMap<'closeDelay'>;

  closeDelay: number | undefined;

  readonly #core = new StatusAnnouncerCore();
  readonly #player = new PlayerController(this, playerContext);
  readonly #container = new ContextConsumer(this, {
    context: containerContext,
    callback: () => this.#reconnect(),
    subscribe: true,
  });

  #disconnect: AbortController | null = null;
  #inputActionUnsubscribe: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.setAttribute('role', 'status');

    this.#disconnect = new AbortController();
    this.#core.state.subscribe(() => this.requestUpdate(), { signal: this.#disconnect.signal });
    this.#reconnect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#inputActionUnsubscribe?.();
    this.#inputActionUnsubscribe = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  override destroyCallback(): void {
    this.#inputActionUnsubscribe?.();
    this.#core.destroy();
    super.destroyCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps({ closeDelay: this.closeDelay });
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const label = this.#core.state.current.label;
    if (label) {
      this.setAttribute('aria-label', label);
    } else {
      this.removeAttribute('aria-label');
    }
  }

  #reconnect(): void {
    this.#inputActionUnsubscribe?.();
    this.#inputActionUnsubscribe = null;

    const container = this.#container.value?.container;
    if (!container) return;

    this.#inputActionUnsubscribe = subscribeToInputActions(container, (event) => {
      this.#core.processEvent(event, getMediaSnapshot(this.#player.value));
    });
  }
}
