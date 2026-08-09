import { Slider, TimeSlider as TimeSliderPrimitive } from '@videojs/core/components';
import { SpinnerIcon } from '@videojs/icons/components';
import { surface } from '../../styles/components/popup.tailwind';
import {
  slider,
  sliderBuffer,
  sliderFill,
  sliderPreview,
  sliderThumb,
  sliderTrack,
  sliderValue,
  thumbnail,
  thumbnailImage,
} from '../../styles/components/slider.tailwind';

export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root className={slider}>
      <TimeSliderPrimitive.Track className={sliderTrack}>
        <TimeSliderPrimitive.Fill className={sliderFill} />
        <TimeSliderPrimitive.Buffer className={sliderBuffer} />
      </TimeSliderPrimitive.Track>
      <TimeSliderPrimitive.Thumb className={sliderThumb} />
      <Slider.Thumbnail.Root className={[surface, thumbnail]}>
        <Slider.Thumbnail.Image className={thumbnailImage} />
        <TimeSliderPrimitive.Value className={sliderValue} type="pointer" />
        <SpinnerIcon className="size-media-icon drop-shadow-media-icon" />
      </Slider.Thumbnail.Root>
      <TimeSliderPrimitive.Preview className={sliderPreview}>
        <TimeSliderPrimitive.Value className={sliderValue} type="pointer" />
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
