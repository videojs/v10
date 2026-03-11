import { createPlayer, PlayButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-play-button-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
        />
        <PlayButton
          className="react-play-button-basic__button"
          render={(props, state) => (
            <button {...props}>{state.ended ? 'Replay' : state.paused ? 'Play' : 'Pause'}</button>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}
