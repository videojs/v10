import type { SliderPreviewOverflow, TimeSliderProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { Box, type Props } from 'vjsc/components';

import { SliderBuffer, SliderFill, SliderThumb, SliderTrack } from '../../components/sliders/slider';
import sliderStyles from '../../styles/sliders/slider.styles';
import styles from './time-slider.styles';

export interface AudioTimeSliderProps extends CoreProps {
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
      <$.TimeSlider.Thumb $render={SliderThumb} className={styles.thumb} />
      <$.TimeSlider.Preview className={sliderStyles.preview} overflow={previewOverflow}>
        <Box className={styles.previewContent}>
          <$.TimeSlider.Value className={styles.value} type="pointer" />
        </Box>
      </$.TimeSlider.Preview>
    </$.TimeSlider.Root>
  );
}
