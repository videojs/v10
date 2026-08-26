import type { TimeSliderProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { SpinnerIcon } from '@videojs/icons/vjsc';
import { Box, type Props, Template } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import sliderStyles from '../../styles/sliders/slider.styles';
import thumbnailStyles from '../../styles/sliders/thumbnail.styles';
import styles from '../../styles/sliders/time-slider.styles';
import surfaceStyles from '../../styles/surfaces/surface.styles';

export function TimeSlider({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.TimeSlider.Root className={[sliderStyles.root, styles.root, className]} {...props}>
      <$.TimeSlider.Chapters className={styles.chapters}>
        <Template name="chapter" className={styles.chapter}>
          <$.TimeSlider.Track className={[sliderStyles.track, styles.chapterTrack]}>
            <$.TimeSlider.Buffer className={sliderStyles.buffer} />
            <$.TimeSlider.Fill className={sliderStyles.fill} />
          </$.TimeSlider.Track>
        </Template>
      </$.TimeSlider.Chapters>
      <$.TimeSlider.Thumb className={[sliderStyles.thumb, styles.thumb]} />
      <$.TimeSlider.Preview className={sliderStyles.preview} overflow="visible">
        <$.Slider.Thumbnail.Root className={[sliderStyles.previewContent, surfaceStyles.root, thumbnailStyles.root]}>
          <$.Slider.Thumbnail.Image className={thumbnailStyles.image} />
          <SpinnerIcon className={thumbnailStyles.spinnerIcon} />
        </$.Slider.Thumbnail.Root>
        <Box className={[sliderStyles.previewContent, styles.previewContent]}>
          <$.TimeSlider.ChapterTitle className={styles.chapterTitle} />
          <$.TimeSlider.Value className={styles.value} type="pointer" />
        </Box>
      </$.TimeSlider.Preview>
    </$.TimeSlider.Root>
  );
}

export const meta = {
  name: 'time-slider',
  type: 'component',
  title: 'Time Slider',
  description: 'A playback timeline for seeking, with current and buffered progress plus time and thumbnail previews.',
} as const satisfies SkinComponentMeta;
