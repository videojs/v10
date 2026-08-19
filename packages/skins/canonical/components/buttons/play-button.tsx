import type { PlayButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function PlayButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.PlayButton className={[styles.root, styles.play, className]} {...props}>
        <RestartIcon className={[styles.icon, styles.icons.restart]} />
        <PlayIcon className={[styles.icon, styles.icons.play]} />
        <PauseIcon className={[styles.icon, styles.icons.pause]} />
      </$.PlayButton>
    </ButtonTooltip>
  );
}
