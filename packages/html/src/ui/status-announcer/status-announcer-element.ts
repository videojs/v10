import { StatusAnnouncerCore } from '@videojs/core';
import { applyVisuallyHiddenStyle, getMediaSnapshot, isSliderFocused } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { playerContext } from '../../player/context';
import { MediaElement } from '../media-element';

export class StatusAnnouncerElement extends MediaElement {
  static readonly tagName = 'media-status-announcer';

  static override properties = {
    closeDelay: { type: Number, attribute: 'close-delay' },
  } satisfies PropertyDeclarationMap<'closeDelay'>;

  closeDelay: number | undefined;

  readonly #core = new StatusAnnouncerCore();
  readonly #player = new ContextConsumer(this, {
    context: playerContext,
    callback: () => this.#reconnect(),
    subscribe: true,
  });

  #disconnect: AbortController | null = null;
  #storeUnsubscribe: (() => void) | null = null;
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
      shouldAnnounceSeek: () => !isSliderFocused(this.ownerDocument),
      shouldAnnounceVolume: () => !isSliderFocused(this.ownerDocument),
    });
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const label = this.#core.state.current.label;
    this.#ensureLiveText().textContent = label ?? '';
  }

  #reconnect(): void {
    this.#storeUnsubscribe?.();
    this.#storeUnsubscribe = null;
    this.#core.resetSnapshot();

    const store = this.#player.value;
    if (!store) return;

    this.#core.processSnapshot(getMediaSnapshot(store));
    this.#storeUnsubscribe = store.subscribe(() => this.#core.processSnapshot(getMediaSnapshot(store)));
  }

  #ensureLiveText(): HTMLElement {
    if (this.#liveText?.isConnected) return this.#liveText;

    const existing = this.querySelector<HTMLElement>('[data-status-announcer-content]');
    this.#liveText = existing ?? document.createElement('span');
    this.#liveText.setAttribute('data-status-announcer-content', '');
    applyVisuallyHiddenStyle(this.#liveText);

    if (!existing) this.append(this.#liveText);

    return this.#liveText;
  }
}
