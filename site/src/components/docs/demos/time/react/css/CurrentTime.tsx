import { createPlayer, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './CurrentTime.css';

const Player = createPlayer({ features: videoFeatures });

export default function CurrentTime() {
  return (
    <Player.Provider>
      <Player.Container className="react-time-current-time">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <Time.Value type="current" className="react-time-current-time__value" />
      </Player.Container>
    </Player.Provider>
  );
}
