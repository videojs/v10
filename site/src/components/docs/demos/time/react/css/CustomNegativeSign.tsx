import { createPlayer, features, Time, Video } from '@videojs/react';

import './CustomNegativeSign.css';

const Player = createPlayer({ features: [...features.video] });

export default function CustomNegativeSign() {
  return (
    <Player.Provider>
      <Player.Container className="time-custom-negative-sign">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          loop
        />
        <Time.Value type="remaining" negativeSign={'\u2212'} className="time-custom-negative-sign__value" />
      </Player.Container>
    </Player.Provider>
  );
}
