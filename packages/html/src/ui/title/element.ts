import { TitleCore, TitleDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectControls, selectMetadata } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/controller';
import { UIElement } from '../ui-element';

/**
 * Displays the resolved content title.
 *
 * The element owns its text content. Set the title through the player's `content-title` attribute.
 */
export class TitleElement extends UIElement {
  static readonly tagName = 'media-title';

  readonly #core = new TitleCore();
  readonly #metadataState = new PlayerController(this, playerContext, selectMetadata);
  readonly #controlsState = new PlayerController(this, playerContext, selectControls);

  override connectedCallback(): void {
    super.connectedCallback();

    if (__DEV__ && !this.#metadataState.value) {
      logMissingFeature(this.localName, this.#metadataState.displayName!);
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const metadata = this.#metadataState.value;
    if (!metadata) return;

    const state = this.#core.getState(metadata, this.#controlsState.value);

    this.textContent = state.title;

    this.hidden = state.hidden;

    applyStateDataAttrs(this, state, TitleDataAttrs);
  }
}
