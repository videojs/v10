import type { SliderPreviewOverflow, TimeSliderProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { Box, type Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/sliders/audio-time-slider.styles';
import sliderStyles from '../../styles/sliders/slider.styles';
import { SliderBuffer, SliderFill, SliderThumb, SliderTrack } from './slider';

interface AudioTimeSliderProps extends CoreProps {
  previewOverflow?: SliderPreviewOverflow | undefined;
}

export function AudioTimeSlider({
  className,
  previewOverflow = 'visible',
  ...props
}: Props<AudioTimeSliderProps> = {}) {
  return (
    <$.TimeSlider.Root className={[sliderStyles.root, styles.root, className]} {...props}>
      <$.TimeSlider.Track $render={SliderTrack}>
        <$.TimeSlider.Buffer $render={SliderBuffer} />
        <$.TimeSlider.Fill $render={SliderFill} />
      </$.TimeSlider.Track>
      <$.TimeSlider.Thumb $render={SliderThumb} />
      <$.TimeSlider.Preview className={sliderStyles.preview} overflow={previewOverflow}>
        <Box className={styles.previewContent}>
          <$.TimeSlider.Value className={styles.value} type="pointer" />
        </Box>
      </$.TimeSlider.Preview>
    </$.TimeSlider.Root>
  );
}

export const meta = {
  name: 'audio-time-slider',
  type: 'component',
  title: 'Audio Time Slider',
  description: 'A compact playback timeline with buffered progress and a time-only pointer preview.',
} as const satisfies SkinComponentMeta;
