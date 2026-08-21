import type { VolumeSliderProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';
import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/components/slider.styles';

export function VolumeSlider({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.VolumeSlider.Root className={[styles.root, className]} thumbAlignment="edge" {...props}>
      <$.VolumeSlider.Track className={styles.track}>
        <$.VolumeSlider.Fill className={styles.fill} />
      </$.VolumeSlider.Track>
      <$.VolumeSlider.Thumb className={[styles.thumb, styles.persistentThumb]} />
    </$.VolumeSlider.Root>
  );
}

export const meta = {
  name: 'volume-slider',
  type: 'component',
  title: 'Volume Slider',
  description:
    'A horizontal or vertical slider for adjusting playback volume by dragging, using the keyboard, or scrolling.',
} as const satisfies SkinComponentMeta;
