import { Slider } from '@videojs/react';
import { useState } from 'react';

import './WithPreview.css';

export default function WithPreview() {
  const [value, setValue] = useState(50);

  return (
    <div className="react-slider-preview">
      <Slider.Root className="react-slider-preview__slider" value={value} onValueChange={setValue}>
        <Slider.Track className="react-slider-preview__track">
          <Slider.Fill className="react-slider-preview__fill" />
        </Slider.Track>
        <Slider.Thumb className="react-slider-preview__thumb" />
        <Slider.Preview className="react-slider-preview__preview">
          <Slider.Value type="pointer" className="react-slider-preview__value" />
        </Slider.Preview>
      </Slider.Root>
    </div>
  );
}
