import { CastButtonCore, CastButtonDataAttrs, type MediaRemotePlaybackState } from '@videojs/core';
import { selectRemotePlayback } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

export class CastButtonElement extends MediaButtonElement<CastButtonCore> {
  static readonly tagName = 'media-cast-button';

  protected readonly core = new CastButtonCore();
  protected readonly stateAttrMap = CastButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectRemotePlayback);

  protected activate(state: MediaRemotePlaybackState): void {
    this.core.toggle(state);
  }
}
