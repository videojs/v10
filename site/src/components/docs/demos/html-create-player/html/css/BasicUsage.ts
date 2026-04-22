import {
  applyElementProps,
  applyStateDataAttrs,
  createButton,
  createPlayer,
  MediaElement,
  PlayerController,
  selectPlayback,
} from '@videojs/html';
import { videoFeatures } from '@videojs/html/video';
import '@videojs/html/media/container';

const { ProviderMixin, context } = createPlayer({
  features: videoFeatures,
});

class VideoPlayer extends ProviderMixin(MediaElement) {
  static readonly tagName = 'demo-video-player';
}

class PlayToggle extends MediaElement {
  static readonly tagName = 'demo-play-toggle';

  readonly #player = new PlayerController(this, context, selectPlayback);

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

    applyElementProps(this, buttonProps, this.#disconnect.signal);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override update(): void {
    super.update();
    const state = this.#player.value;
    if (!state) return;
    applyStateDataAttrs(this, state, { paused: 'data-paused', ended: 'data-ended' });
  }
}

customElements.define(VideoPlayer.tagName, VideoPlayer);
customElements.define(PlayToggle.tagName, PlayToggle);
