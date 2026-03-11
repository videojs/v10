import { createPlayer, MuteButton, VolumeSlider } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './WithParts.css';

const Player = createPlayer({ features: videoFeatures });

export default function WithParts() {
  return (
    <Player.Provider>
      <Player.Container className="react-volume-slider-parts">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <MuteButton
          className="react-volume-slider-parts__mute-button"
          render={(props, state) => <button {...props}>{state.muted ? 'Unmute' : 'Mute'}</button>}
        />
        <VolumeSlider.Root className="react-volume-slider-parts__slider">
          <VolumeSlider.Track className="react-volume-slider-parts__track">
            <VolumeSlider.Fill className="react-volume-slider-parts__fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="react-volume-slider-parts__thumb" />
          <VolumeSlider.Value type="pointer" className="react-volume-slider-parts__value" />
        </VolumeSlider.Root>
      </Player.Container>
    </Player.Provider>
  );
}
