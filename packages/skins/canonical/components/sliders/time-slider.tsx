import { Slider, TimeSlider as TimeSliderPrimitive } from '@videojs/core/components';
import { SpinnerIcon } from '@videojs/icons/components';
import { type FunctionComponent, Template } from '@videojs/jsx';
import popupStyles from '../../styles/components/popup.tailwind';
import styles from '../../styles/components/slider.tailwind';

declare const PreviewValue: FunctionComponent;

export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root className={styles.slider}>
      <TimeSliderPrimitive.Chapters className={styles.sliderChapters}>
        <Template name="chapter" className={styles.sliderChapter}>
          <TimeSliderPrimitive.Track className={styles.sliderChapterTrack}>
            <TimeSliderPrimitive.Buffer className={styles.sliderBuffer} />
            <TimeSliderPrimitive.Fill className={styles.sliderFill} />
          </TimeSliderPrimitive.Track>
        </Template>
      </TimeSliderPrimitive.Chapters>
      <TimeSliderPrimitive.Thumb className={[styles.sliderThumb, styles.sliderThumbInteractive]} />
      <TimeSliderPrimitive.Preview className={styles.sliderPreview} overflow="visible">
        <Slider.Thumbnail.Root className={[popupStyles.surface, styles.thumbnail]}>
          <Slider.Thumbnail.Image className={styles.thumbnailImage} />
          <SpinnerIcon className={styles.spinnerIcon} />
        </Slider.Thumbnail.Root>
        <PreviewValue className={styles.previewValue}>
          <TimeSliderPrimitive.ChapterTitle className={styles.chapterTitle} />
          <TimeSliderPrimitive.Value className={styles.sliderValue} type="pointer" />
        </PreviewValue>
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
