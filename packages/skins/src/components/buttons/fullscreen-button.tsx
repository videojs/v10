import type { FullscreenButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/buttons/fullscreen-button.styles';
import { Button } from './button';

export function FullscreenButton({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.FullscreenButton $render={Button} className={[styles.root, className]} {...props}>
      <FullscreenEnterIcon className={[buttonStyles.icon, styles.enterIcon]} />
      <FullscreenExitIcon className={[buttonStyles.icon, styles.exitIcon]} />
    </$.FullscreenButton>
  );
}

export const meta = {
  name: 'fullscreen-button',
  type: 'component',
  title: 'Fullscreen Button',
  description: 'A button that enters and exits fullscreen with state-aware icons.',
} as const satisfies SkinComponentMeta;
