import { createPlayer, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './CurrentDuration.css';

const Player = createPlayer({ features: videoFeatures });

export default function CurrentDuration() {
  return (
    <Player.Provider>
      <Player.Container className="react-time-current-duration">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <Time.Group className="react-time-current-duration__group">
          <Time.Value type="current" />
          <Time.Separator />
          <Time.Value type="duration" />
        </Time.Group>
      </Player.Container>
    </Player.Provider>
  );
}
