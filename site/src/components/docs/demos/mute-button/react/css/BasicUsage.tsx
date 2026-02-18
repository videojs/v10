import { createPlayer, features, MuteButton } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-mute-button-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
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
