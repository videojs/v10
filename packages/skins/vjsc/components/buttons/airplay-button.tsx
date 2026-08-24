import type { AirPlayButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { AirPlayEnterIcon, AirPlayExitIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/components/airplay-button.styles';
import { ButtonTooltip } from './button-tooltip';

export function AirPlayButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.AirPlayButton className={[styles.root, className]} {...props}>
        <AirPlayEnterIcon className={styles.enterIcon} />
        <AirPlayExitIcon className={styles.exitIcon} />
      </$.AirPlayButton>
    </ButtonTooltip>
  );
}

export const meta = {
  name: 'airplay-button',
  type: 'component',
  title: 'AirPlay Button',
  description: 'A state-aware button that starts and stops AirPlay playback.',
} as const satisfies SkinComponentMeta;
