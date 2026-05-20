import { AirplayButtonCore, AirplayButtonDataAttrs, type MediaRemotePlaybackState } from '@videojs/core';
import { selectRemotePlayback } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

export class AirplayButtonElement extends MediaButtonElement<AirplayButtonCore> {
  static readonly tagName = 'media-airplay-button';

  protected readonly core = new AirplayButtonCore();
  protected readonly stateAttrMap = AirplayButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectRemotePlayback);

  protected activate(state: MediaRemotePlaybackState): void {
    this.core.toggle(state);
  }
}
