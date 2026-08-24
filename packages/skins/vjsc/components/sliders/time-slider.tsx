import type { TimeSliderProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { SpinnerIcon } from '@videojs/icons/vjsc';
import { Box, type Props, Template } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import thumbnailStyles from '../../styles/components/thumbnail.styles';
import styles from '../../styles/components/time-slider.styles';

export function TimeSlider({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.TimeSlider.Root className={[styles.root, className]} {...props}>
      <$.TimeSlider.Chapters className={styles.chapters}>
        <Template name="chapter" className={styles.chapter}>
          <$.TimeSlider.Track className={styles.chapterTrack}>
            <$.TimeSlider.Buffer className={styles.buffer} />
            <$.TimeSlider.Fill className={styles.fill} />
          </$.TimeSlider.Track>
        </Template>
      </$.TimeSlider.Chapters>
      <$.TimeSlider.Thumb className={styles.thumb} />
      <$.TimeSlider.Preview className={styles.preview} overflow="visible">
        <$.Slider.Thumbnail.Root className={thumbnailStyles.root}>
          <$.Slider.Thumbnail.Image className={thumbnailStyles.image} />
          <SpinnerIcon className={thumbnailStyles.spinnerIcon} />
        </$.Slider.Thumbnail.Root>
        <Box className={styles.previewContent}>
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
