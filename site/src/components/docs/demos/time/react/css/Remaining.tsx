import { createPlayer, features, Time, Video } from '@videojs/react';

import './Remaining.css';

const Player = createPlayer({ features: [...features.video] });

export default function Remaining() {
  return (
    <Player.Provider>
      <Player.Container className="react-time-remaining">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <Time.Value type="remaining" className="react-time-remaining__value" />
      </Player.Container>
    </Player.Provider>
  );
}
