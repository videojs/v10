import { TitleCore, TitleDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectMetadata } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { UIElement } from '../ui-element';

/**
 * Displays the resolved content title.
 *
 * The element owns its text content. Set the title through the player's `content-title` attribute rather than by
 * writing children.
 */
export class TitleElement extends UIElement {
  static readonly tagName = 'media-title';

  readonly #core = new TitleCore();
  readonly #metadataState = new PlayerController(this, playerContext, selectMetadata);

  readonly #textNode = new Text();

  override connectedCallback(): void {
    super.connectedCallback();

    if (!this.#textNode.parentNode) {
      this.append(this.#textNode);
    }

    if (__DEV__ && !this.#metadataState.value) {
      logMissingFeature(this.localName, this.#metadataState.displayName!);
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const metadata = this.#metadataState.value;
    if (!metadata) return;

    const state = this.#core.getState(metadata);

    this.#textNode.textContent = state.title;
    this.hidden = state.hidden;

    applyStateDataAttrs(this, state, TitleDataAttrs);
  }
}
