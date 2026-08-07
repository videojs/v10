import { TitleCore, TitleDataAttrs } from '@videojs/core';
import {
  applyStateDataAttrs,
  logMissingFeature,
  selectControls,
  selectMetadata,
  selectPlayback,
} from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

/**
 * Displays the resolved content title.
 *
 * The element owns its text content. Set the title through the player's
 * `content-title` attribute or `setContentTitle` rather than by writing
 * children.
 */
export class TitleElement extends MediaElement {
  static readonly tagName = 'media-title';

  readonly #core = new TitleCore();
  readonly #metadataState = new PlayerController(this, playerContext, selectMetadata);
  readonly #controlsState = new PlayerController(this, playerContext, selectControls);
  readonly #playbackState = new PlayerController(this, playerContext, selectPlayback);

  readonly #textNode = document.createTextNode('');

  override connectedCallback(): void {
    super.connectedCallback();

    if (!this.#textNode.parentNode) {
      this.appendChild(this.#textNode);
    }

    if (__DEV__ && !this.#metadataState.value) {
      logMissingFeature(this.localName, this.#metadataState.displayName!);
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const metadata = this.#metadataState.value;

    if (!metadata) return;

    // Controls and playback are optional — `TitleCore` falls back to a title
    // that stays visible when either feature is absent.
    this.#core.setMedia({ ...metadata, ...this.#controlsState.value, ...this.#playbackState.value });
    const state = this.#core.getState();

    this.#textNode.textContent = state.title;

    applyStateDataAttrs(this, state, TitleDataAttrs);
  }
}
