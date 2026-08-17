import { Slider } from '@/ui/slider';
import { TimeSlider as TimeSliderPrimitive } from '@/ui/time-slider';
import { SpinnerIcon } from '@/icons';

export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root className="media-slider">
      <TimeSliderPrimitive.Track className="media-slider-track">
        <TimeSliderPrimitive.Buffer className="media-slider-buffer" />
        <TimeSliderPrimitive.Fill className="media-slider-fill" />
      </TimeSliderPrimitive.Track>
      <TimeSliderPrimitive.Thumb className="media-slider-thumb" />
      <div className="media-surface media-thumbnail">
        <Slider.Thumbnail className="media-thumbnail-image" />
        <TimeSliderPrimitive.Value className="media-slider-value" type="pointer" />
        <SpinnerIcon className="media-spinner-icon" />
      </div>
      <TimeSliderPrimitive.Preview className="media-slider-preview">
        <TimeSliderPrimitive.Value className="media-slider-value" type="pointer" />
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
