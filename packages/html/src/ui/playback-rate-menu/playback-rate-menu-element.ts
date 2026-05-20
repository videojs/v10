import { PlaybackRateMenuCore, PlaybackRateMenuDataAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature, selectPlaybackRate } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MenuElement } from '../menu/menu-element';

/** Custom element shell for the `<media-playback-rate-menu>` tag — anchored menu of selectable playback rates. */
export class PlaybackRateMenuElement extends MenuElement {
  /** Custom element tag name. */
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

  /** Accessible label override for the trigger button. */
  label = '';
  /** Disables menu interaction when true. */
  disabled = false;
  /** Default alignment overridden to center against the trigger. */
  override align: MenuElement['align'] = 'center';
  /** Formats a playback rate value for display (e.g., `1` → `"1×"`). */
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
  /** Reactive state shape exposed by the playback-rate menu. */
  export type State = PlaybackRateMenuCore.State;
}
