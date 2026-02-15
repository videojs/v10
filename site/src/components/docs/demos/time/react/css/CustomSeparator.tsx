import { createPlayer, features, Time } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './CustomSeparator.css';

const Player = createPlayer({ features: [...features.video] });

export default function CustomSeparator() {
  return (
    <Player.Provider>
      <Player.Container className="react-time-custom-separator">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <Time.Group className="react-time-custom-separator__group">
          <Time.Value type="current" />
          <Time.Separator> of </Time.Separator>
          <Time.Value type="duration" />
        </Time.Group>
      </Player.Container>
    </Player.Provider>
  );
}
