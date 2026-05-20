import { type MediaPictureInPictureState, PiPButtonCore, PiPButtonDataAttrs } from '@videojs/core';
import { selectPiP } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

/** Custom element shell for the `<media-pip-button>` tag — toggles Picture-in-Picture on the media element. */
export class PiPButtonElement extends MediaButtonElement<PiPButtonCore> {
  /** Custom element tag name. */
  static readonly tagName = 'media-pip-button';

  protected readonly core = new PiPButtonCore();
  protected readonly stateAttrMap = PiPButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectPiP);
  protected override readonly hotkeyAction = 'togglePictureInPicture';

  protected activate(state: MediaPictureInPictureState): void {
    this.core.toggle(state);
  }
}
