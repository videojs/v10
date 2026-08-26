import {
  applyElementProps,
  applyStateDataAttrs,
  createButton,
  createPlayer,
  selectPlayback,
  UIElement,
} from '@videojs/html';
import { videoFeatures } from '@videojs/html/video';
import '@videojs/html/ui/container';

const { PlayerElement: VideoPlayerElement, PlayerController } = createPlayer({
  features: videoFeatures,
});

class PlayToggle extends UIElement {
  static readonly tagName = 'demo-play-toggle';

  readonly #player = new PlayerController(this, selectPlayback);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();

    const buttonProps = createButton({
      onActivate: () => {
        const state = this.#player.value;
        if (!state) return;

        state.paused ? state.play() : state.pause();
      },
      isDisabled: () => !this.#player.value,
    });

    applyElementProps(this, buttonProps, { signal: this.#disconnect.signal });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override update(changed: Map<string, unknown>): void {
    super.update(changed);
    const state = this.#player.value;
    if (!state) return;

    applyStateDataAttrs(this, state, { paused: 'data-paused', ended: 'data-ended' });
  }
}

customElements.define('demo-video-player', VideoPlayerElement);
customElements.define(PlayToggle.tagName, PlayToggle);
