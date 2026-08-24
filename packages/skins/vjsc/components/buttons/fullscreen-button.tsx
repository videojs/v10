import type { FullscreenButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/components/fullscreen-button.styles';
import { ButtonTooltip } from './button-tooltip';

export function FullscreenButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.FullscreenButton className={[styles.root, className]} {...props}>
        <FullscreenEnterIcon className={styles.enterIcon} />
        <FullscreenExitIcon className={styles.exitIcon} />
      </$.FullscreenButton>
    </ButtonTooltip>
  );
}

export const meta = {
  name: 'fullscreen-button',
  type: 'component',
  title: 'Fullscreen Button',
  description: 'A button that enters and exits fullscreen with state-aware icons and an accessible tooltip.',
} as const satisfies SkinComponentMeta;
