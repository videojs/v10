import { createPlayer, features, Time } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './CurrentDuration.css';

const Player = createPlayer({ features: [...features.video] });

export default function CurrentDuration() {
  return (
    <Player.Provider>
      <Player.Container className="time-current-duration">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <Time.Group className="time-current-duration__group">
          <Time.Value type="current" />
          <Time.Separator />
          <Time.Value type="duration" />
        </Time.Group>
      </Player.Container>
    </Player.Provider>
  );
}
