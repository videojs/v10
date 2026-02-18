import { createPlayer, FullscreenButton, features } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-fullscreen-button-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
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
