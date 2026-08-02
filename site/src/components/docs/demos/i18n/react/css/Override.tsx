import { createPlayer } from '@videojs/react';
import { I18nProvider } from '@videojs/react/i18n';
import { Video, VideoSkin, videoFeatures } from '@videojs/react/video';

import '@videojs/react/video/skin.css';
import './Sources.css';

const Player = createPlayer({ features: videoFeatures });

export default function Override() {
  return (
    <Player.Provider>
      <I18nProvider locale="en" translations={{ buttons: { play: 'Player override' } }}>
        <div className="react-i18n-source">
          <VideoSkin className="react-i18n-source__player">
            <Video src="{{VJS10_DEMO_VIDEO_MP4}}" muted playsInline preload="none" />
          </VideoSkin>
        </div>
      </I18nProvider>
    </Player.Provider>
  );
}
