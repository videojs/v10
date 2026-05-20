import { CastButtonCore, CastButtonDataAttrs, type MediaRemotePlaybackState } from '@videojs/core';
import { selectRemotePlayback } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

/** Custom element shell for the `<media-cast-button>` tag — toggles remote playback (Google Cast / AirPlay). */
export class CastButtonElement extends MediaButtonElement<CastButtonCore> {
  /** Custom element tag name. */
  static readonly tagName = 'media-cast-button';

  protected readonly core = new CastButtonCore();
  protected readonly stateAttrMap = CastButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectRemotePlayback);

  protected activate(state: MediaRemotePlaybackState): void {
    this.core.toggle(state);
  }
}
