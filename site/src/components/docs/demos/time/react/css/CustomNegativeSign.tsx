import { createPlayer, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './CustomNegativeSign.css';

const Player = createPlayer({ features: videoFeatures });

export default function CustomNegativeSign() {
  return (
    <Player.Provider>
      <Player.Container className="react-time-custom-negative-sign">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <Time.Value type="remaining" negativeSign="~" className="react-time-custom-negative-sign__value" />
      </Player.Container>
    </Player.Provider>
  );
}
