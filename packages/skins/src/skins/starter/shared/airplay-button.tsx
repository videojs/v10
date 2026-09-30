import * as $ from '@videojs/core/vjsc';
import { AirPlayEnterIcon, AirPlayExitIcon } from '@videojs/icons/vjsc';

import airplayButtonStyles from './airplay-button.styles';
import { Button } from './button';
import buttonStyles from './button.styles';
import { ButtonTooltip } from './tooltip';

export function AirPlayButton() {
  return (
    <ButtonTooltip>
      <$.AirPlayButton $render={Button} className={airplayButtonStyles.root}>
        <AirPlayEnterIcon className={[buttonStyles.icon, airplayButtonStyles.enterIcon]} />
        <AirPlayExitIcon className={[buttonStyles.icon, airplayButtonStyles.exitIcon]} />
      </$.AirPlayButton>
    </ButtonTooltip>
  );
}
