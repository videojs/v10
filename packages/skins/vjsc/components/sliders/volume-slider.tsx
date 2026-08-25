import type { VolumeSliderProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import sliderStyles from '../../styles/sliders/slider.styles';
import styles from '../../styles/sliders/volume-slider.styles';

export function VolumeSlider({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.VolumeSlider.Root className={[sliderStyles.root, styles.root, className]} thumbAlignment="edge" {...props}>
      <$.VolumeSlider.Track className={sliderStyles.track}>
        <$.VolumeSlider.Fill className={sliderStyles.fill} />
      </$.VolumeSlider.Track>
      <$.VolumeSlider.Thumb className={[sliderStyles.thumb, styles.thumb]} />
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
