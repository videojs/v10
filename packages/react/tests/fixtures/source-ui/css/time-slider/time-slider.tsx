import './styles.css';
import { Slider, TimeSlider as TimeSliderPrimitive } from '@videojs/react';
import { SpinnerIcon } from './icons';
export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root className="vjs-slider-root" thumbAlignment="edge">
      <TimeSliderPrimitive.Track className="vjs-slider-track">
        <TimeSliderPrimitive.Fill className="vjs-slider-fill" />
        <TimeSliderPrimitive.Buffer className="vjs-slider-buffer" />
      </TimeSliderPrimitive.Track>
      <TimeSliderPrimitive.Thumb className="vjs-slider-thumb" />
      <div className="vjs-thumbnail-root">
        <Slider.Thumbnail className="vjs-thumbnail-image" />
        <TimeSliderPrimitive.Value className="vjs-slider-value" type="pointer" />
        <SpinnerIcon className="vjs-spinner-icon" />
      </div>
      <TimeSliderPrimitive.Preview className="vjs-slider-preview">
        <TimeSliderPrimitive.Value className="vjs-slider-value" type="pointer" />
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
