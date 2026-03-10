import { createPlayer, PlaybackRateButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-playback-rate-button-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <PlaybackRateButton
          className="react-playback-rate-button-basic__button"
          render={(props, state) => <button {...props}>{Math.round(state.rate * 10) / 10}&times;</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}
