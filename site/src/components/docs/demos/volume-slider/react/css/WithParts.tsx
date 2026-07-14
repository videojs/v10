import { createPlayer, MuteButton, VolumeSlider } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function WithParts() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <MuteButton
          className="media-mute-button"
          render={(props, state) => <button {...props}>{state.muted ? 'Unmute' : 'Mute'}</button>}
        />
        <VolumeSlider.Root className="media-volume-slider">
          <VolumeSlider.Track className="media-slider-track">
            <VolumeSlider.Fill className="media-slider-fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider-thumb" />
          <VolumeSlider.Value type="pointer" className="media-slider-value" />
        </VolumeSlider.Root>
      </Player.Container>
    </Player.Provider>
  );
}
