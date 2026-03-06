import { Controls, createPlayer, PlayButton, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-controls-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />

        <Controls.Root className="react-controls-basic__root">
          <Controls.Group className="react-controls-basic__bottom" aria-label="Playback controls">
            <PlayButton
              className="react-controls-basic__button"
              render={(props, state) => <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>}
            />

            <Time.Value type="current" className="react-controls-basic__time" />
          </Controls.Group>
        </Controls.Root>
      </Player.Container>
    </Player.Provider>
  );
}
