import { createPlayer } from '@videojs/react';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { VideoSkin, videoFeatures } from '@videojs/react/video';
import '@videojs/react/video/skin.css';
import { createRoot } from 'react-dom/client';
import { MEDIA } from './shared';

const Player = createPlayer({ features: videoFeatures });

function App() {
  return (
    <Player.Provider>
      <VideoSkin poster={MEDIA.hls.poster} style={{ maxWidth: 800, aspectRatio: '16/9' }}>
        <HlsVideo src={MEDIA.hls.url} playsInline crossOrigin="anonymous">
          <track kind="metadata" label="thumbnails" src={MEDIA.hls.storyboard} default />
        </HlsVideo>
      </VideoSkin>
    </Player.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
