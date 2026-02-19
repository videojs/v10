import { applyElementProps, createButton, createPlayer, features, MediaElement } from '@videojs/html';

const { PlayerElement, PlayerController, context } = createPlayer({
  features: [...features.video],
});

class DemoPlayer extends PlayerElement {
  static readonly tagName = 'demo-ctrl-player';
}

class PlayerActions extends MediaElement {
  static readonly tagName = 'demo-ctrl-actions';

  readonly #player = new PlayerController(this, context);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
    const signal = this.#disconnect.signal;

    const playBtn = this.querySelector<HTMLButtonElement>('.action-play')!;
    const pauseBtn = this.querySelector<HTMLButtonElement>('.action-pause')!;
    const volumeBtn = this.querySelector<HTMLButtonElement>('.action-volume')!;

    const bind = (el: HTMLElement, action: () => void) => {
      const props = createButton({ onActivate: action, isDisabled: () => !this.#player.value });
      applyElementProps(el, props, signal);
    };

    bind(playBtn, () => this.#player.value?.play());
    bind(pauseBtn, () => this.#player.value?.pause());
    bind(volumeBtn, () => this.#player.value?.changeVolume(0.5));
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }
}

class PlayerState extends MediaElement {
  static readonly tagName = 'demo-ctrl-state';

  readonly #state = new PlayerController(this, context, (s) => ({
    paused: s.paused,
    currentTime: s.currentTime,
    volume: s.volume,
  }));

  protected override update(): void {
    super.update();
    const state = this.#state.value;
    if (!state) return;

    const el = this.querySelector('.state-text');
    if (el) {
      el.textContent = `Paused: ${state.paused ? 'Yes' : 'No'} | Time: ${state.currentTime.toFixed(1)}s | Volume: ${Math.round(state.volume * 100)}%`;
    }
  }
}

customElements.define(DemoPlayer.tagName, DemoPlayer);
customElements.define(PlayerActions.tagName, PlayerActions);
customElements.define(PlayerState.tagName, PlayerState);
