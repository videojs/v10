import { Slider, TimeSlider as TimeSliderPrimitive } from '@videojs/core/components';
import { SpinnerIcon } from '@videojs/icons/components';
import { slider, thumbnail } from '../../styles/components/slider.tailwind';

export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root className={slider.root} thumbAlignment="edge">
      <TimeSliderPrimitive.Track className={slider.track}>
        <TimeSliderPrimitive.Fill className={[slider.fillBase, slider.fill]} />
        <TimeSliderPrimitive.Buffer className={[slider.fillBase, slider.buffer]} />
      </TimeSliderPrimitive.Track>
      <TimeSliderPrimitive.Thumb className={slider.thumb} />
      <Slider.Thumbnail.Root className={thumbnail.root}>
        <Slider.Thumbnail.Image className={thumbnail.image} />
        <TimeSliderPrimitive.Value className={slider.value} type="pointer" />
        <SpinnerIcon className="size-media-icon drop-shadow-media-icon" />
      </Slider.Thumbnail.Root>
      <TimeSliderPrimitive.Preview className={slider.preview}>
        <TimeSliderPrimitive.Value className={slider.value} type="pointer" />
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
