import type { CaptionsButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { CaptionsOffIcon, CaptionsOnIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function CaptionsButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.CaptionsButton className={[styles.root, styles.captions, className]} {...props}>
        <CaptionsOffIcon className={[styles.icon, styles.icons.captionsOff]} />
        <CaptionsOnIcon className={[styles.icon, styles.icons.captionsOn]} />
      </$.CaptionsButton>
    </ButtonTooltip>
  );
}
