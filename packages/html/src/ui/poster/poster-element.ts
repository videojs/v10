import { PosterCore, PosterDataAttrs } from '@videojs/core';
import { selectPlayback } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaUIElement } from '../media-ui-element';

/** Custom element shell for the `<media-poster>` tag — placeholder image shown before playback begins. */
export class PosterElement extends MediaUIElement<PosterCore> {
  /** Custom element tag name. */
  static readonly tagName = 'media-poster';

  protected readonly core = new PosterCore();
  protected readonly stateAttrMap = PosterDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectPlayback);
}
