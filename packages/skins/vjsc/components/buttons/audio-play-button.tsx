import { Box, type Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/buttons/audio-play-button.styles';
import { BufferingIndicator } from '../feedback/buffering-indicator';
import { PlayButton } from './play-button';

export function AudioPlayButton({ className, ...props }: Props = {}) {
  return (
    <Box className={[styles.root, className]} {...props}>
      <BufferingIndicator className={styles.bufferingIndicator} />
      <PlayButton />
    </Box>
  );
}

export const meta = {
  name: 'audio-play-button',
  type: 'component',
  title: 'Audio Play Button',
  description: 'A play button with buffering feedback overlaid without changing the audio control layout.',
} as const satisfies SkinComponentMeta;
