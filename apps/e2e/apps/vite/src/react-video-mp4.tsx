import { createPlayer } from '@videojs/react';
import { Video, VideoSkin, videoFeatures } from '@videojs/react/video';
import '@videojs/react/video/skin.css';
import { createRoot } from 'react-dom/client';
import { MEDIA } from './shared';

const Player = createPlayer({ features: videoFeatures });

function App() {
  return (
    <Player.Provider>
      <VideoSkin poster={MEDIA.mp4.poster} style={{ maxWidth: 800, aspectRatio: '16/9' }}>
        <Video src={MEDIA.mp4.url} playsInline crossOrigin="anonymous">
          <track kind="metadata" label="thumbnails" src={MEDIA.mp4.storyboard} default />
        </Video>
      </VideoSkin>
    </Player.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
