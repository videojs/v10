import { CastButtonCore, CastButtonDataAttrs, type MediaCastState } from '@videojs/core';
import { selectCast } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

export class CastButtonElement extends MediaButtonElement<CastButtonCore> {
  static readonly tagName = 'media-cast-button';

  protected readonly core = new CastButtonCore();
  protected readonly stateAttrMap = CastButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectCast);

  protected activate(state: MediaCastState): void {
    this.core.toggle(state);
  }
}
