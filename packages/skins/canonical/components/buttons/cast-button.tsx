import type { CastButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/components';
import { CastEnterIcon, CastExitIcon } from '@videojs/icons/components';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function CastButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.CastButton className={[styles.root, styles.cast, className]} {...props}>
        <CastEnterIcon className={[styles.icon, styles.icons.castEnter]} />
        <CastExitIcon className={[styles.icon, styles.icons.castExit]} />
      </$.CastButton>
    </ButtonTooltip>
  );
}
