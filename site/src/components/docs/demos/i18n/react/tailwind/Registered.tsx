import { createPlayer } from '@videojs/react';
import { I18nProvider, registerI18n } from '@videojs/react/i18n';
import { Video, VideoSkin, videoFeatures } from '@videojs/react/video';

import '@videojs/react/video/skin.css';

registerI18n('en-x-demo', {
  buttons: {
    play: 'Registered custom translation',
  },
});

const { Player } = createPlayer({ features: videoFeatures });

export default function Registered() {
  return (
    <Player>
      <I18nProvider locale="en-x-demo">
        <div className="p-4">
          <VideoSkin className="aspect-video w-full">
            <Video src="{{VJS10_DEMO_VIDEO_MP4}}" muted playsInline preload="none" />
          </VideoSkin>
        </div>
      </I18nProvider>
    </Player>
  );
}
