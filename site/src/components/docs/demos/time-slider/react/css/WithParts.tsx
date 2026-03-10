import { createPlayer, TimeSlider } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function WithParts() {
  return (
    <Player.Provider>
      <Player.Container className="video-player">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <TimeSlider.Root className="media-time-slider">
          <TimeSlider.Track className="media-slider-track">
            <TimeSlider.Buffer className="media-slider-buffer" />
            <TimeSlider.Fill className="media-slider-fill" />
          </TimeSlider.Track>
          <TimeSlider.Thumb className="media-slider-thumb" />
          <TimeSlider.Value type="pointer" className="media-slider-value" />
        </TimeSlider.Root>
      </Player.Container>
    </Player.Provider>
  );
}
