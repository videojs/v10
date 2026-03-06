import { createPlayer, MuteButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './VolumeLevels.css';

const Player = createPlayer({ features: videoFeatures });

export default function VolumeLevels() {
  return (
    <Player.Provider>
      <Player.Container className="react-mute-button-volume-levels">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <MuteButton
          className="react-mute-button-volume-levels__button"
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
