import { Controls, createPlayer, PlayButton, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />

        <Controls.Root className="media-controls">
          <Controls.Group className="controls-group" aria-label="Playback controls">
            <PlayButton
              className="button"
              render={(props, state) => <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>}
            />

            <Time.Value type="current" className="time" />
          </Controls.Group>
        </Controls.Root>
      </Player.Container>
    </Player.Provider>
  );
}
