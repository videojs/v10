import type { VolumeSliderProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';
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
