import { type MediaTimeState, SeekButtonCore, SeekButtonDataAttrs } from '@videojs/core';
import { selectTime } from '@videojs/core/dom';
import type { PropertyDeclarationMap } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

/** Custom element shell for the `<media-seek-button>` tag — seeks forward or backward by a fixed number of seconds. */
export class SeekButtonElement extends MediaButtonElement<SeekButtonCore> {
  /** Custom element tag name. */
  static readonly tagName = 'media-seek-button';

  static override properties: PropertyDeclarationMap = {
    ...MediaButtonElement.properties,
    seconds: { type: Number },
  };

  /** Seek offset in seconds; positive seeks forward, negative seeks backward. */
  seconds = SeekButtonCore.defaultProps.seconds;

  protected readonly core = new SeekButtonCore();
  protected readonly stateAttrMap = SeekButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectTime);

  protected activate(state: MediaTimeState): void {
    this.core.seek(state);
  }
}
