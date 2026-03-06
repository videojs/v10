import { createPlayer, FullscreenButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-fullscreen-button-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <FullscreenButton
          className="react-fullscreen-button-basic__button"
          render={(props, state) => <button {...props}>{state.fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}
