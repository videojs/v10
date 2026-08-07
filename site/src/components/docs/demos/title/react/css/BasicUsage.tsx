import { createPlayer, PlayButton, Title } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider contentTitle="Big Buck Bunny">
      <Player.Container className="react-title-basic">
        <Video loop muted playsInline src="{{VJS10_DEMO_VIDEO_MP4}}" />
        <Title className="react-title-basic__title" />
        <PlayButton
          className="react-title-basic__button"
          render={(props, state) => <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}
