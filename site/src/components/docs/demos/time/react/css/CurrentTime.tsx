import { createPlayer, features, Time, Video } from '@videojs/react';

import './CurrentTime.css';

const Player = createPlayer({ features: [...features.video] });

export default function CurrentTime() {
  return (
    <Player.Provider>
      <Player.Container className="time-current-time">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <Time.Value type="current" className="time-current-time__value" />
      </Player.Container>
    </Player.Provider>
  );
}
