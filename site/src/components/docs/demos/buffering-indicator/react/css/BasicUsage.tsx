import { BufferingIndicator, createPlayer, features, Video } from '@videojs/react';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="buffering-indicator-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <BufferingIndicator
          className="buffering-indicator-basic__overlay"
          render={(props, state) => (
            <div {...props}>{state.visible && <div className="buffering-indicator-basic__spinner" />}</div>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}
