import { Slider } from '@videojs/react';
import { useState } from 'react';

import './BasicUsage.css';

export default function BasicUsage() {
  const [value, setValue] = useState(50);

  return (
    <div className="react-slider-basic">
      <Slider.Root className="react-slider-basic__slider" value={value} onValueChange={setValue}>
        <Slider.Track className="react-slider-basic__track">
          <Slider.Fill className="react-slider-basic__fill" />
        </Slider.Track>
        <Slider.Thumb className="react-slider-basic__thumb" />
      </Slider.Root>
    </div>
  );
}
