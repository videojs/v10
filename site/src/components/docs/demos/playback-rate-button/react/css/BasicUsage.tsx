import { createPlayer, PlaybackRateButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
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
        <PlaybackRateButton
          className="media-playback-rate-button"
          render={(props, state) => <button {...props}>{Math.round(state.rate * 10) / 10}&times;</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}
