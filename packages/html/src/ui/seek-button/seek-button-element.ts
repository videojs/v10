import { type MediaTimeState, SeekButtonCore, SeekButtonDataAttrs } from '@videojs/core';
import { selectTime } from '@videojs/core/dom';
import type { PropertyDeclarationMap } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaButtonElement } from '../media-button-element';

export class SeekButtonElement extends MediaButtonElement<SeekButtonCore> {
  static readonly tagName = 'media-seek-button';

  static override properties: PropertyDeclarationMap = {
    ...MediaButtonElement.properties,
    seconds: { type: Number },
  };

  seconds = SeekButtonCore.defaultProps.seconds;

  protected readonly core = new SeekButtonCore();
  protected readonly stateAttrMap = SeekButtonDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectTime);
  protected override readonly hotkeyAction = 'seekStep';

  protected override get hotkeyValue(): number | undefined {
    return this.seconds;
  }

  protected activate(state: MediaTimeState): void {
    this.core.seek(state);
  }
}
