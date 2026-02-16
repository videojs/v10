import {
  applyElementProps,
  applyStateDataAttrs,
  createButton,
  createPlayer,
  features,
  MediaElement,
  selectPlayback,
} from '@videojs/html';

const { PlayerElement, PlayerController, context } = createPlayer({
  features: [...features.video],
});

class VideoPlayer extends PlayerElement {
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
