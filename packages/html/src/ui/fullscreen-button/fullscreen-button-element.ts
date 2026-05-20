import { FullscreenButtonCore, FullscreenButtonDataAttrs, type MediaFullscreenState } from '@videojs/core';
import { selectFullscreen } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

/** Custom element shell for the `<media-fullscreen-button>` tag — toggles fullscreen on the player container. */
export class FullscreenButtonElement extends MediaButtonElement<FullscreenButtonCore> {
  /** Custom element tag name. */
  static readonly tagName = 'media-fullscreen-button';

  protected readonly core = new FullscreenButtonCore();
  protected readonly stateAttrMap = FullscreenButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectFullscreen);
  protected override readonly hotkeyAction = 'toggleFullscreen';

  protected activate(state: MediaFullscreenState): void {
    this.core.toggle(state);
  }
}
