import { BufferingIndicator, createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-buffering-indicator-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <BufferingIndicator
          className="react-buffering-indicator-basic__overlay"
          render={(props, state) => (
            <div {...props}>{state.visible && <div className="react-buffering-indicator-basic__spinner" />}</div>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}
