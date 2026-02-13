import { createPlayer, features, PiPButton, Video } from '@videojs/react';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="pip-button-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <PiPButton
          className="pip-button-basic__button"
          render={(props, state) => <button {...props}>{state.pip ? 'Exit PiP' : 'Enter PiP'}</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}
