import { Controls, createPlayer, features, PlayButton, Time } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="controls-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />

        <Controls.Root className="controls-basic__root">
          <Controls.Group className="controls-basic__bottom" aria-label="Playback controls">
            <PlayButton
              className="controls-basic__button"
              render={(props, state) => <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>}
            />

            <Time.Value type="current" className="controls-basic__time" />
          </Controls.Group>
        </Controls.Root>
      </Player.Container>
    </Player.Provider>
  );
}
