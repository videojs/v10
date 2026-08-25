import { createStatusAnnouncerLabels, StatusAnnouncerCore } from '@videojs/core';
import { type StatusAnnouncerStore, shouldAnnounceStatusChange, subscribeToStatusAnnouncer } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { i18nContext } from '../../i18n/context';
import { I18nController } from '../../i18n/controller';
import { containerContext, playerContext } from '../../player/context';
import { UIElement } from '../ui-element';

export class StatusAnnouncerElement extends UIElement {
  static readonly tagName = 'media-status-announcer';

  static override properties = {
    closeDelay: { type: Number, attribute: 'close-delay' },
  } satisfies PropertyDeclarationMap<'closeDelay'>;

  closeDelay: number | undefined;

  readonly #i18n = new I18nController(this, i18nContext);
  readonly #core = new StatusAnnouncerCore();
  // Context can resolve while connected markup is still upgrading.
  #storeUnsubscribe: (() => void) | null = null;
  readonly #player = new ContextConsumer(this, {
    context: playerContext,
    callback: (store) => this.#reconnect(store),
    subscribe: true,
  });
  readonly #container = new ContextConsumer(this, { context: containerContext, subscribe: true });

  #disconnect: AbortController | null = null;
  #liveText: HTMLElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.destroyed) return;

    this.setAttribute('role', 'status');
    this.#ensureLiveText();

    this.#disconnect = new AbortController();
    this.#core.state.subscribe(() => this.requestUpdate(), { signal: this.#disconnect.signal });
    this.#reconnect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#storeUnsubscribe?.();
    this.#storeUnsubscribe = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  override destroyCallback(): void {
    this.#storeUnsubscribe?.();
    this.#core.destroy();
    super.destroyCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps({
      closeDelay: this.closeDelay,
      labels: createStatusAnnouncerLabels(this.#i18n.value, this.#i18n.locale),
      shouldAnnounce: () => shouldAnnounceStatusChange(this.#container.value?.container),
    });
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const label = this.#core.state.current.label;
    const liveText = this.#ensureLiveText();

    if (label === null) {
      liveText.replaceChildren();
    } else {
      liveText.replaceChildren(document.createTextNode(label));
    }
  }

  #reconnect(store: StatusAnnouncerStore | undefined = this.#player.value): void {
    this.#storeUnsubscribe?.();
    this.#storeUnsubscribe = null;

    if (!store) {
      this.#core.resetSnapshot();
      return;
    }

    this.#storeUnsubscribe = subscribeToStatusAnnouncer(store, this.#core);
  }

  #ensureLiveText(): HTMLElement {
    if (this.#liveText?.isConnected) return this.#liveText;

    const existing = this.querySelector<HTMLElement>('[data-status-announcer-content]');

    this.#liveText = existing ?? document.createElement('span');
    this.#liveText.setAttribute('data-status-announcer-content', '');

    if (!existing) this.append(this.#liveText);

    return this.#liveText;
  }
}
