import type { PlaybackRateButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/buttons/playback-rate-button.styles';
import { Button } from './button';

export function PlaybackRateButton({ className, ...props }: Props<CoreProps> = {}) {
  return <$.PlaybackRateButton $render={Button} className={[styles.root, className]} {...props} />;
}

export const meta = {
  name: 'playback-rate-button',
  type: 'component',
  title: 'Playback Rate Button',
  description: 'Shows the current speed and cycles through available playback rates.',
} as const satisfies SkinComponentMeta;
