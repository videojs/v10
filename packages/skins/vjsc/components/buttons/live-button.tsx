import type { LiveButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/buttons/live-button.styles';
import { Button } from './button';

export function LiveButton({ className, ...props }: Props<CoreProps> = {}) {
  return <$.LiveButton $render={Button} className={[styles.root, className]} {...props} />;
}

export const meta = {
  name: 'live-button',
  type: 'component',
  title: 'Live Button',
  description: 'Shows live-edge status and seeks playback back to the live point when activated.',
} as const satisfies SkinComponentMeta;
