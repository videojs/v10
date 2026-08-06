import { Slider, TimeSlider as TimeSliderPrimitive } from '@videojs/core/components';
import { SpinnerIcon } from '@videojs/icons/components';

export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root thumbAlignment="edge">
      <TimeSliderPrimitive.Track>
        <TimeSliderPrimitive.Fill />
        <TimeSliderPrimitive.Buffer />
      </TimeSliderPrimitive.Track>
      <TimeSliderPrimitive.Thumb />
      <Slider.Thumbnail.Root>
        <Slider.Thumbnail.Image />
        <TimeSliderPrimitive.Value type="pointer" />
        <SpinnerIcon />
      </Slider.Thumbnail.Root>
      <TimeSliderPrimitive.Preview>
        <TimeSliderPrimitive.Value type="pointer" />
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
