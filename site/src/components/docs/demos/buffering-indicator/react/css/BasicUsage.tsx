import { BufferingIndicator, createPlayer, features } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-buffering-indicator-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
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
