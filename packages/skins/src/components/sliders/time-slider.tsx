import type { SliderPreviewOverflow, TimeSliderProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { SpinnerIcon } from '@videojs/icons/vjsc';
import { Box, type Props, type PropsOf, Slot, Template } from 'vjsc/components';

import type { SkinComponentDescription } from '../../meta';
import popupStyles from '../../styles/popups/popup.styles';
import sliderStyles from '../../styles/sliders/slider.styles';
import thumbnailStyles from '../../styles/sliders/thumbnail.styles';
import styles from '../../styles/sliders/time-slider.styles';
import { SliderBuffer, SliderFill, SliderThumb, SliderTrack } from './slider';

export interface TimeSliderProps extends CoreProps {
  previewOverflow?: SliderPreviewOverflow | undefined;
  /** Draws the thumbnail preview image in place of the one the skin renders. */
  renderThumbnail?: PropsOf<typeof $.Slider.Thumbnail.Image>['children'];
}

export function TimeSlider({
  className,
  previewOverflow = 'visible',
  renderThumbnail,
  ...props
}: Props<TimeSliderProps> = {}) {
  return (
    <$.TimeSlider.Root className={[sliderStyles.root, styles.root, className]} {...props}>
      <$.TimeSlider.Chapters className={styles.chapters}>
        <Template name="chapter" className={styles.chapter}>
          <$.TimeSlider.Track $render={SliderTrack} className={styles.chapterTrack}>
            <$.TimeSlider.Buffer $render={SliderBuffer} className={styles.chapterLayer} />
            <$.TimeSlider.Fill $render={SliderFill} className={styles.chapterLayer} />
          </$.TimeSlider.Track>
        </Template>
      </$.TimeSlider.Chapters>
      <$.TimeSlider.Thumb $render={SliderThumb} className={styles.thumb} />
      <$.TimeSlider.Preview className={sliderStyles.preview} overflow={previewOverflow}>
        <$.Slider.Thumbnail.Root className={[sliderStyles.previewContent, popupStyles.surface, thumbnailStyles.root]}>
          <Slot name="thumbnail">
            <$.Slider.Thumbnail.Image className={thumbnailStyles.image}>{renderThumbnail}</$.Slider.Thumbnail.Image>
          </Slot>
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
  title: 'Time Slider',
  description: 'A playback timeline for seeking, with current and buffered progress plus time and thumbnail previews.',
} as const satisfies SkinComponentDescription;
