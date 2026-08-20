import { FullscreenButtonCore, FullscreenButtonDataAttrs } from '@videojs/core';
import { selectFullscreen } from '@videojs/core/dom';
import type { MediaFullscreenState } from '@videojs/media';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

export class FullscreenButtonElement extends MediaButtonElement<FullscreenButtonCore> {
  static readonly tagName = 'media-fullscreen-button';

  protected readonly core = new FullscreenButtonCore();
  protected readonly stateAttrMap = FullscreenButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectFullscreen);
  protected override readonly hotkeyAction = 'toggleFullscreen';

  protected activate(state: MediaFullscreenState): Promise<void> {
    return this.core.toggle(state);
  }
}
