import { PosterCore, PosterDataAttrs } from '@videojs/core';
import { selectPlayback } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaUIElement } from '../media-ui-element';

export class PosterElement extends MediaUIElement<PosterCore> {
  static readonly tagName = 'media-poster';

  protected readonly core = new PosterCore();
  protected readonly stateAttrMap = PosterDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectPlayback);
}
