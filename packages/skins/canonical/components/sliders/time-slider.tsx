import { Slider, TimeSlider as TimeSliderPrimitive } from '@videojs/core/components';
import { SpinnerIcon } from '@videojs/icons/components';
import popupStyles from '../../styles/components/popup.tailwind';
import styles from '../../styles/components/slider.tailwind';

export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root className={styles.slider}>
      <TimeSliderPrimitive.Track className={styles.sliderTrack}>
        <TimeSliderPrimitive.Buffer className={styles.sliderBuffer} />
        <TimeSliderPrimitive.Fill className={styles.sliderFill} />
      </TimeSliderPrimitive.Track>
      <TimeSliderPrimitive.Thumb className={styles.sliderThumb} />
      <Slider.Thumbnail.Root className={[popupStyles.surface, styles.thumbnail]}>
        <Slider.Thumbnail.Image className={styles.thumbnailImage} />
        <TimeSliderPrimitive.Value className={styles.sliderValue} type="pointer" />
        <SpinnerIcon className={styles.spinnerIcon} />
      </Slider.Thumbnail.Root>
      <TimeSliderPrimitive.Preview className={styles.sliderPreview}>
        <TimeSliderPrimitive.Value className={styles.sliderValue} type="pointer" />
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
