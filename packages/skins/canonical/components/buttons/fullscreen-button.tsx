import type { FullscreenButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function FullscreenButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.FullscreenButton className={[styles.root, styles.fullscreen, className]} {...props}>
        <FullscreenEnterIcon className={[styles.icon, styles.icons.fullscreenEnter]} />
        <FullscreenExitIcon className={[styles.icon, styles.icons.fullscreenExit]} />
      </$.FullscreenButton>
    </ButtonTooltip>
  );
}
