import { createPlayer } from '@videojs/react';
import { I18nProvider } from '@videojs/react/i18n';
import { Video, VideoSkin, videoFeatures } from '@videojs/react/video';

import '@videojs/react/video/skin.css';

const { Player } = createPlayer({ features: videoFeatures });

export default function Override() {
  return (
    <Player>
      <I18nProvider locale="en" translations={{ buttons: { play: 'Player override' } }}>
        <div className="p-4">
          <VideoSkin className="aspect-video w-full">
            <Video src="{{VJS10_DEMO_VIDEO_MP4}}" muted playsInline preload="none" />
          </VideoSkin>
        </div>
      </I18nProvider>
    </Player>
  );
}
