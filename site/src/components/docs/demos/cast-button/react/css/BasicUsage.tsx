import { CastButton, createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <CastButton
          className="media-cast-button"
          render={(props, state) => (
            <button {...props}>{state.castState === 'connected' ? 'Stop casting' : 'Start casting'}</button>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}
