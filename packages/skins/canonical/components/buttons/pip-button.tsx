import type { PiPButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { PipEnterIcon, PipExitIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function PiPButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.PiPButton className={[styles.root, styles.pip, className]} {...props}>
        <PipEnterIcon className={[styles.icon, styles.icons.pipEnter]} />
        <PipExitIcon className={[styles.icon, styles.icons.pipExit]} />
      </$.PiPButton>
    </ButtonTooltip>
  );
}
