import { createPlayer, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './CustomSeparator.css';

const Player = createPlayer({ features: videoFeatures });

export default function CustomSeparator() {
  return (
    <Player.Provider>
      <Player.Container className="react-time-custom-separator">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
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
