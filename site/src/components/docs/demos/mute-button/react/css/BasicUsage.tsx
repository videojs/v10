import { createPlayer, MuteButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-mute-button-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <MuteButton
          className="react-mute-button-basic__button"
          render={(props, state) => <button {...props}>{state.muted ? 'Unmute' : 'Mute'}</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}
