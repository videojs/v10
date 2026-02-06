import { createPlayer, features, PlayButton, Video } from '@videojs/react';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="play-button-basic">
        <Video src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4" muted />
        <PlayButton className="play-button-basic__button">Play</PlayButton>
      </Player.Container>
    </Player.Provider>
  );
}
