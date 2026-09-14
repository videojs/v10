import { TitleCore, TitleDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectControls, selectMetadata } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/controller';
import { UIElement } from '../ui-element';

/**
 * Groups the title's content and reflects its visibility state.
 *
 * Set the title through the player's `content-title` attribute. Place a `<media-title-value>` inside this element to
 * render the resolved text alongside any author-owned content.
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

    const state = this.#core.getState(metadata);

    const value = this.querySelector('media-title-value');

    if (value) value.textContent = state.title;

    this.hidden = state.hidden;
    this.toggleAttribute('data-visible', this.#controlsState.value?.controlsVisible ?? false);

    applyStateDataAttrs(this, state, TitleDataAttrs);
  }
}
