import { AirPlayButton as AirPlayButtonPrimitive } from '@videojs/core/components';
import { AirPlayEnterIcon, AirPlayExitIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function AirPlayButton() {
  return (
    <ButtonTooltip side="top">
      <AirPlayButtonPrimitive className={[styles.root, styles.airplay]}>
        <AirPlayEnterIcon className={[styles.icon, styles.icons.airplayEnter]} />
        <AirPlayExitIcon className={[styles.icon, styles.icons.airplayExit]} />
      </AirPlayButtonPrimitive>
    </ButtonTooltip>
  );
}
