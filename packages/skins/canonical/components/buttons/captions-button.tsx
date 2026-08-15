import { CaptionsButton as CaptionsButtonPrimitive } from '@videojs/core/components';
import { CaptionsOffIcon, CaptionsOnIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip';

export function CaptionsButton() {
  return (
    <ButtonTooltip side="top">
      <CaptionsButtonPrimitive className={[styles.button, styles.captionsButton]}>
        <CaptionsOffIcon className={[styles.buttonIcon, styles.captionsOffIcon]} />
        <CaptionsOnIcon className={[styles.buttonIcon, styles.captionsOnIcon]} />
      </CaptionsButtonPrimitive>
    </ButtonTooltip>
  );
}
