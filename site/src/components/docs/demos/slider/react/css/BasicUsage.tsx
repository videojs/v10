import { createPlayer, Slider } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-slider-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <Slider.Root className="react-slider-basic__slider">
          <Slider.Track className="react-slider-basic__track">
            <Slider.Fill className="react-slider-basic__fill" />
          </Slider.Track>
          <Slider.Thumb className="react-slider-basic__thumb" />
          <Slider.Preview className="react-slider-basic__preview">
            <Slider.Value type="pointer" className="react-slider-basic__value" />
          </Slider.Preview>
        </Slider.Root>
      </Player.Container>
    </Player.Provider>
  );
}
