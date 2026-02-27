import { createPlayer, features, PlaybackRateButton } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-playback-rate-button-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <PlaybackRateButton
          className="react-playback-rate-button-basic__button"
          render={(props, state) => <button {...props}>{Math.round(state.rate * 10) / 10}&times;</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}
