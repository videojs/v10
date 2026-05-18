import { PlaybackRateMenuCore, PlaybackRateMenuDataAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature, selectPlaybackRate } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MenuElement } from '../menu/menu-element';

export class PlaybackRateMenuElement extends MenuElement {
  static override readonly tagName = 'media-playback-rate-menu';

  static override properties = {
    ...MenuElement.properties,
    label: { type: String },
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<
    | 'open'
    | 'defaultOpen'
    | 'side'
    | 'align'
    | 'closeOnEscape'
    | 'closeOnOutsideClick'
    | 'boundary'
    | 'label'
    | 'disabled'
  >;

  label = '';
  disabled = false;
  override align: MenuElement['align'] = 'center';
  formatRate = PlaybackRateMenuCore.defaultProps.formatRate;

  readonly #core = new PlaybackRateMenuCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectPlaybackRate);

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#mediaState.value;
    if (!media) return;

    this.#core.setProps(this);
    this.#core.setMedia(media);
    const state = this.#core.getState();

    applyElementProps(this, this.#core.getAttrs(state));
    applyStateDataAttrs(this, state, PlaybackRateMenuDataAttrs);
  }
}

export namespace PlaybackRateMenuElement {
  export type State = PlaybackRateMenuCore.State;
}
