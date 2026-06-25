import { PosterCore, PosterDataAttrs } from '@videojs/core';
import { selectPlayback } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaUIElement } from '../media-ui-element';

export class PosterElement extends MediaUIElement<PosterCore> {
  static readonly tagName = 'media-poster';

  static get observedAttributes(): string[] {
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return [...super.observedAttributes, 'placeholdersrc'];
  }

  protected readonly core = new PosterCore();
  protected readonly stateAttrMap = PosterDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectPlayback);

  override attributeChangedCallback(attr: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(attr, oldValue, newValue);

    if (attr === 'placeholdersrc') {
      if (newValue) {
        this.style.setProperty('--media-poster-placeholder', `url(${newValue})`);
      } else {
        this.style.removeProperty('--media-poster-placeholder');
      }
    }
  }
}
