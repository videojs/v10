import { AirPlayButton as AirPlayButtonPrimitive } from '@videojs/core/components';
import { AirPlayEnterIcon, AirPlayExitIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip';

export function AirPlayButton() {
  return (
    <ButtonTooltip side="top">
      <AirPlayButtonPrimitive className={[styles.button, styles.airplayButton]}>
        <AirPlayEnterIcon className={[styles.buttonIcon, styles.airplayEnterIcon]} />
        <AirPlayExitIcon className={[styles.buttonIcon, styles.airplayExitIcon]} />
      </AirPlayButtonPrimitive>
    </ButtonTooltip>
  );
}
