import { PlaybackRateMenuCore, PlaybackRateMenuDataAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature, selectPlaybackRate } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class PlaybackRateMenuTriggerElement extends MediaElement {
  static readonly tagName = 'media-playback-rate-menu-trigger';

  static override properties = {
    label: { type: String },
    disabled: { type: Boolean },
    commandfor: { type: String },
  } satisfies PropertyDeclarationMap<'label' | 'disabled' | 'commandfor'>;

  label = '';
  disabled = false;
  commandfor: string | undefined = undefined;
  formatRate = PlaybackRateMenuCore.defaultProps.formatRate;

  readonly #core = new PlaybackRateMenuCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectPlaybackRate);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#disconnect = new AbortController();
    applyElementProps(
      this,
      {
        onClick: this.#handleClick,
        onKeyDown: this.#handleKeyDown,
      },
      { signal: this.#disconnect.signal }
    );

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  /** Returns the trigger's current label derived from media state. */
  getLabel(): string | undefined {
    return this.#core.state.current.label || undefined;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#mediaState.value;
    if (!media) return;

    this.#core.setProps(this);
    this.#core.setMedia(media);
    const state = this.#core.getState();

    applyElementProps(this, {
      role: 'button',
      tabIndex: 0,
      ...this.#core.getAttrs(state),
    });
    applyStateDataAttrs(this, state, PlaybackRateMenuDataAttrs);
  }

  #handleClick = (event: MouseEvent): void => {
    if (this.#mediaState.value && !this.#core.state.current.disabled) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.target !== event.currentTarget) return;

    if (!this.#mediaState.value || this.#core.state.current.disabled) {
      if (event.key !== 'Tab') event.preventDefault();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.click();
    }
  };
}

export namespace PlaybackRateMenuTriggerElement {
  export type State = PlaybackRateMenuCore.State;
}
