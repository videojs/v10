import { FullscreenButtonCore, FullscreenButtonDataAttrs, type MediaFullscreenState } from '@videojs/core';
import { selectFullscreen } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

export class FullscreenButtonElement extends MediaButtonElement<FullscreenButtonCore> {
  static readonly tagName = 'media-fullscreen-button';

  protected readonly core = new FullscreenButtonCore();
  protected readonly stateAttrMap = FullscreenButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectFullscreen);
  protected override readonly hotkeyAction = 'toggleFullscreen';

  protected activate(state: MediaFullscreenState): void {
    this.core.toggle(state);
  }
}
