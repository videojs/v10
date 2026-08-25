import type { PlayButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/buttons/play-button.styles';
import { ButtonTooltip } from './button-tooltip';

export function PlayButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.PlayButton className={[buttonStyles.root, styles.root, className]} {...props}>
        <RestartIcon className={[buttonStyles.icon, styles.restartIcon]} />
        <PlayIcon className={[buttonStyles.icon, styles.playIcon]} />
        <PauseIcon className={[buttonStyles.icon, styles.pauseIcon]} />
      </$.PlayButton>
    </ButtonTooltip>
  );
}

export const meta = {
  name: 'play-button',
  type: 'component',
  title: 'Play Button',
  description:
    'A three-state button that plays, pauses, or restarts media with matching icons and an accessible tooltip.',
} as const satisfies SkinComponentMeta;
