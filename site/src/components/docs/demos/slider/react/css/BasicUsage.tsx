import { Slider } from '@videojs/react';
import { useState } from 'react';

export default function BasicUsage() {
  const [value, setValue] = useState(50);

  return (
    <div className="demo">
      <Slider.Root className="media-slider" value={value} onValueChange={setValue}>
        <Slider.Track className="media-slider-track">
          <Slider.Fill className="media-slider-fill" />
        </Slider.Track>
        <Slider.Thumb className="media-slider-thumb" />
      </Slider.Root>
    </div>
  );
}
