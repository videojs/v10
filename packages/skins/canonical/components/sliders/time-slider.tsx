import * as $ from '@videojs/core/components';
import { SpinnerIcon } from '@videojs/icons/components';
import { type FunctionComponent, Template } from 'vjsc/components';
import popupStyles from '../../styles/components/popup.styles';
import styles from '../../styles/components/slider.styles';

declare const PreviewValue: FunctionComponent;

export function TimeSlider() {
  return (
    <$.TimeSlider.Root className={styles.root}>
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
