import { ALLOWED_GESTURE_TYPES, GestureCore } from '@videojs/core';
import { selectPlayback } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class GestureElement extends MediaElement {
  static readonly tagName = 'media-gesture';

  static override properties = {
    type: { type: String },
    command: { type: String },
  };

  type = GestureCore.defaultProps.type;
  command = GestureCore.defaultProps.command;

  readonly #core = new GestureCore();
  readonly #player = new PlayerController(this, playerContext);
  readonly #playback = new PlayerController(this, playerContext, selectPlayback);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.style.display = 'contents';
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  update(changed: PropertyValues): void {
    super.update?.(changed);

    if (changed.has('type') || changed.has('command')) {
      this.#core.setProps({ type: this.type, command: this.command });

      if (changed.has('type') && ALLOWED_GESTURE_TYPES.includes(this.type)) {
        this.#disconnect?.abort();
        this.#disconnect = new AbortController();
        const { signal } = this.#disconnect;

        const container = this.#player.value?.target?.container;
        container?.addEventListener(this.type, this.#handleEvent, { signal });
      }
    }
  }

  #handleEvent = (event: Event): void => {
    const composedTarget = event.composedPath()?.[0] as Element | undefined;
    // TODO: allow other elements than video
    const allowList = ['video'];
    if (!composedTarget || !allowList.includes(composedTarget?.localName)) return;

    const media = this.#playback.value;
    if (!media) return;

    this.#core.activate(media);
  };
}
