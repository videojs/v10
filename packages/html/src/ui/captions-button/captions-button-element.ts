import { CaptionsButtonCore, CaptionsButtonDataAttrs, type MediaTextTrackState } from '@videojs/core';
import { selectTextTrack } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

/** Custom element shell for the `<media-captions-button>` tag — toggles subtitles/captions on the default text track. */
export class CaptionsButtonElement extends MediaButtonElement<CaptionsButtonCore> {
  /** Custom element tag name. */
  static readonly tagName = 'media-captions-button';

  protected readonly core = new CaptionsButtonCore();
  protected readonly stateAttrMap = CaptionsButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectTextTrack);
  protected override readonly hotkeyAction = 'toggleSubtitles';

  protected activate(state: MediaTextTrackState): void {
    this.core.toggle(state);
  }
}
