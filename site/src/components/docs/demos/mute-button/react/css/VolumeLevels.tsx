import { createPlayer, MuteButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function VolumeLevels() {
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
        <MuteButton
          className="media-mute-button"
          render={(props, state) => (
            <button {...props}>
              {state.volumeLevel === 'off'
                ? 'Off'
                : state.volumeLevel === 'low'
                  ? 'Low'
                  : state.volumeLevel === 'medium'
                    ? 'Medium'
                    : 'High'}
            </button>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}
