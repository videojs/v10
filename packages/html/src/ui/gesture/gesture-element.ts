import { ALLOWED_GESTURE_TYPES, GestureCore } from '@videojs/core';
import { logMissingFeature, selectPlayback } from '@videojs/core/dom';
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

  type: GestureCore.Props['type'] = GestureCore.defaultProps.type;
  command: GestureCore.Props['command'] = GestureCore.defaultProps.command;

  readonly #core = new GestureCore();
  readonly #player = new PlayerController(this, playerContext);
  readonly #mediaState = new PlayerController(this, playerContext, selectPlayback);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.style.display = 'contents';

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  update(changed: PropertyValues): void {
    super.update?.(changed);

    const media = this.#mediaState.value;
    if (!media) return;

    this.#core.setMedia(media);

    if (changed.has('type') || changed.has('command')) {
      this.#core.setProps({ type: this.type, command: this.command });

      if (changed.has('type') && ALLOWED_GESTURE_TYPES.includes(this.type)) {
        this.#disconnect?.abort();
        this.#disconnect = new AbortController();
        const { signal } = this.#disconnect;

        const container = this.#player.value?.target?.container;
        container?.addEventListener(
          this.type,
          (event: PointerEvent) => {
            const target = event.target as Element;
            if (target !== container && !target.localName.endsWith('video')) return;

            this.#core.handleGesture(event);
          },
          { signal }
        );
      }
    }
  }
}
