import { CaptionsButtonCore, CaptionsButtonDataAttrs, type MediaTextTrackState } from '@videojs/core';
import { selectTextTrack } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

export class CaptionsButtonElement extends MediaButtonElement<CaptionsButtonCore> {
  static readonly tagName = 'media-captions-button';

  protected readonly core = new CaptionsButtonCore();
  protected readonly stateAttrMap = CaptionsButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectTextTrack);

  protected activate(state: MediaTextTrackState): void {
    this.core.toggle(state);
  }
}
