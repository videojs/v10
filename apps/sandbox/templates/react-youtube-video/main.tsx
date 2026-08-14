import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useSkin } from '@app/shared/react/use-skin';
import { YOUTUBE_VIDEO_SRC } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { YouTubeVideo } from '@videojs/react/media/youtube-video';
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

function readStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

function App() {
  const skin = useSkin();
  const styling = useMemo(readStyling, []);

  return (
    <VideoPlayer>
      <VideoSkinComponent skin={skin} styling={styling} className="aspect-video max-w-4xl mx-auto">
        <YouTubeVideo className="block w-full h-full" src={YOUTUBE_VIDEO_SRC} playsInline />
      </VideoSkinComponent>
    </VideoPlayer>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
