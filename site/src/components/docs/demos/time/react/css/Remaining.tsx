import { createPlayer, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './Remaining.css';

const Player = createPlayer({ features: videoFeatures });

export default function Remaining() {
  return (
    <Player.Provider>
      <Player.Container className="react-time-remaining">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
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
