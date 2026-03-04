import { ControlsCore, ControlsDataAttrs } from '@videojs/core';
import { selectControls } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaUIElement } from '../media-ui-element';

export class ControlsElement extends MediaUIElement<ControlsCore> {
  static readonly tagName = 'media-controls';

  protected readonly core = new ControlsCore();
  protected readonly stateAttrMap = ControlsDataAttrs;
  protected readonly mediaState = new PlayerController(this, playerContext, selectControls);
}
