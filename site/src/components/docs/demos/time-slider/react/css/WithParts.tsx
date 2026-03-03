import { createPlayer, TimeSlider } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './WithParts.css';

const Player = createPlayer({ features: videoFeatures });

export default function WithParts() {
  return (
    <Player.Provider>
      <Player.Container className="react-time-slider-parts">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <TimeSlider.Root className="react-time-slider-parts__slider">
          <TimeSlider.Track className="react-time-slider-parts__track">
            <TimeSlider.Buffer className="react-time-slider-parts__buffer" />
            <TimeSlider.Fill className="react-time-slider-parts__fill" />
          </TimeSlider.Track>
          <TimeSlider.Thumb className="react-time-slider-parts__thumb" />
          <TimeSlider.Value type="pointer" className="react-time-slider-parts__value" />
        </TimeSlider.Root>
      </Player.Container>
    </Player.Provider>
  );
}
