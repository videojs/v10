import { Slider, TimeSlider as TimeSliderPrimitive } from '@videojs/core/components';
import { SpinnerIcon } from '@videojs/icons/components';
import { type FunctionComponent, Template } from '@videojs/jsx';
import popupStyles from '../../styles/components/popup.styles';
import styles from '../../styles/components/slider.styles';

declare const PreviewValue: FunctionComponent;

export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root className={styles.root}>
      <TimeSliderPrimitive.Chapters className={styles.chapters}>
        <Template name="chapter" className={styles.chapter}>
          <TimeSliderPrimitive.Track className={styles.chapterTrack}>
            <TimeSliderPrimitive.Buffer className={styles.buffer} />
            <TimeSliderPrimitive.Fill className={styles.fill} />
          </TimeSliderPrimitive.Track>
        </Template>
      </TimeSliderPrimitive.Chapters>
      <TimeSliderPrimitive.Thumb className={[styles.thumb, styles.interactiveThumb]} />
      <TimeSliderPrimitive.Preview className={styles.preview} overflow="visible">
        <Slider.Thumbnail.Root className={[popupStyles.surface, styles.thumbnail]}>
          <Slider.Thumbnail.Image className={styles.image} />
          <SpinnerIcon className={styles.spinner} />
        </Slider.Thumbnail.Root>
        <PreviewValue className={styles.previewValue}>
          <TimeSliderPrimitive.ChapterTitle className={styles.chapterTitle} />
          <TimeSliderPrimitive.Value className={styles.value} type="pointer" />
        </PreviewValue>
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
