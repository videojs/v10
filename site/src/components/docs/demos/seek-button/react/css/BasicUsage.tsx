import { createPlayer, features, SeekButton } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-seek-button-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <div className="react-seek-button-basic__buttons">
          <SeekButton
            seconds={-5}
            className="react-seek-button-basic__button"
            render={(props, state) => (
              <button {...props}>
                {state.direction === 'backward' ? '\u23EA' : '\u23E9'} {5}s
              </button>
            )}
          />
          <SeekButton
            seconds={10}
            className="react-seek-button-basic__button"
            render={(props, state) => (
              <button {...props}>
                {10}s {state.direction === 'forward' ? '\u23E9' : '\u23EA'}
              </button>
            )}
          />
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
