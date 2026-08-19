import type { AirPlayButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { AirPlayEnterIcon, AirPlayExitIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function AirPlayButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.AirPlayButton className={[styles.root, styles.airplay, className]} {...props}>
        <AirPlayEnterIcon className={[styles.icon, styles.icons.airplayEnter]} />
        <AirPlayExitIcon className={[styles.icon, styles.icons.airplayExit]} />
      </$.AirPlayButton>
    </ButtonTooltip>
  );
}
