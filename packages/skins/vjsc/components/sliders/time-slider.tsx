import type { TimeSliderProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { SpinnerIcon } from '@videojs/icons/vjsc';
import { Group as PreviewValue, type Props, Template } from 'vjsc/components';
import type { SkinComponentMeta } from '../../meta';
import popupStyles from '../../styles/components/popup.styles';
import styles from '../../styles/components/slider.styles';

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
      <$.TimeSlider.Thumb className={[styles.thumb, styles.interactiveThumb]} />
      <$.TimeSlider.Preview className={styles.preview} overflow="visible">
        <$.Slider.Thumbnail.Root className={[popupStyles.surface, styles.thumbnail]}>
          <$.Slider.Thumbnail.Image className={styles.image} />
          <SpinnerIcon className={styles.spinner} />
        </$.Slider.Thumbnail.Root>
        <PreviewValue className={styles.previewValue}>
          <$.TimeSlider.ChapterTitle className={styles.chapterTitle} />
          <$.TimeSlider.Value className={styles.value} type="pointer" />
        </PreviewValue>
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
