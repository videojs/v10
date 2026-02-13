import { createPlayer, features, MuteButton, Video } from '@videojs/react';

import './VolumeLevels.css';

const Player = createPlayer({ features: [...features.video] });

export default function VolumeLevels() {
  return (
    <Player.Provider>
      <Player.Container className="react-mute-button-volume-levels">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
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
