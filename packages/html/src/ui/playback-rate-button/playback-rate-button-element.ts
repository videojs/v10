import { type MediaPlaybackRateState, PlaybackRateButtonCore, PlaybackRateButtonDataAttrs } from '@videojs/core';
import { applyElementProps, selectPlaybackRate, type UIEvent } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { toggleCommandTarget } from '../command-for';
import { MediaButtonElement } from '../media-button-element';

export class PlaybackRateButtonElement extends MediaButtonElement<PlaybackRateButtonCore> {
  static readonly tagName = 'media-playback-rate-button';

  static override properties = {
    label: { type: String },
    disabled: { type: Boolean },
    commandfor: { type: String },
  } satisfies PropertyDeclarationMap<'label' | 'disabled' | 'commandfor'>;

  commandfor: string | undefined = undefined;

  protected readonly core = new PlaybackRateButtonCore();
  protected readonly stateAttrMap = PlaybackRateButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectPlaybackRate);

  protected activate(state: MediaPlaybackRateState, event?: UIEvent): void {
    if (this.commandfor) {
      if (event instanceof KeyboardEvent) {
        toggleCommandTarget(this, this.commandfor);
      }
      return;
    }
    this.core.cycle(state);
  }

  protected override getIsButtonDisabled(): boolean {
    const media = this.mediaState.value;
    if (super.getIsButtonDisabled()) return true;
    if (this.commandfor && media && media.playbackRates.length === 0) return true;
    return false;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);

    if (changed.has('commandfor')) {
      if (this.commandfor) {
        this.setAttribute('commandfor', this.commandfor);
      } else {
        this.removeAttribute('commandfor');
      }
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.mediaState.value;
    if (!media || !this.commandfor) return;

    applyElementProps(this, {
      'aria-disabled': this.getIsButtonDisabled() ? 'true' : undefined,
    });
  }
}

export namespace PlaybackRateButtonElement {
  export type State = PlaybackRateButtonCore.State;
}
