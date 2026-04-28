import { LiveButtonCore, LiveButtonDataAttrs } from '@videojs/core';
import { type LiveButtonMediaState, selectLiveButton } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

export class LiveButtonElement extends MediaButtonElement<LiveButtonCore> {
  static readonly tagName = 'media-live-button';

  protected readonly core = new LiveButtonCore();
  protected readonly stateAttrMap = LiveButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectLiveButton);

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.textContent?.trim()) {
      this.textContent = LiveButtonCore.defaultText;
    }
  }

  protected activate(state: LiveButtonMediaState): void {
    this.core.seekToLive(state);
  }
}
