import { type MediaPlaybackRateState, PlaybackRateButtonCore, PlaybackRateButtonDataAttrs } from '@videojs/core';
import { selectPlaybackRate } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

/** Custom element shell for the `<media-playback-rate-button>` tag — cycles through the configured playback rate values. */
export class PlaybackRateButtonElement extends MediaButtonElement<PlaybackRateButtonCore> {
  /** Custom element tag name. */
  static readonly tagName = 'media-playback-rate-button';

  protected readonly core = new PlaybackRateButtonCore();
  protected readonly stateAttrMap = PlaybackRateButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectPlaybackRate);

  protected activate(state: MediaPlaybackRateState): void {
    this.core.cycle(state);
  }
}
