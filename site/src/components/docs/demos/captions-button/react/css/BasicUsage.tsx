import { CaptionsButton, createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-captions-button-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        >
          <track kind="captions" src="/docs/demos/captions-button/captions.vtt" srcLang="en" label="English" />
        </Video>
        <CaptionsButton
          className="react-captions-button-basic__button"
          render={(props, state) => (
            <button {...props}>{state.subtitlesShowing ? 'Captions Off' : 'Captions On'}</button>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}
