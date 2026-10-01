import * as $ from '@videojs/core/vjsc';
import { CaptionsOffIcon, CaptionsOnIcon } from '@videojs/icons/vjsc';

import { Button } from './button';
import buttonStyles from './button.styles';
import captionsButtonStyles from './captions-button.styles';
import { ButtonTooltip } from './tooltip';

export function CaptionsButton() {
  return (
    <ButtonTooltip>
      <$.CaptionsButton $render={Button} className={captionsButtonStyles.root}>
        <CaptionsOffIcon className={[buttonStyles.icon, captionsButtonStyles.offIcon]} />
        <CaptionsOnIcon className={[buttonStyles.icon, captionsButtonStyles.onIcon]} />
      </$.CaptionsButton>
    </ButtonTooltip>
  );
}
