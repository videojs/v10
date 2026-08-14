import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useSkin } from '@app/shared/react/use-skin';
import { VIMEO_VIDEO_SRC } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { VimeoVideo } from '@videojs/react/media/vimeo-video';
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
        <VimeoVideo className="block w-full h-full" src={VIMEO_VIDEO_SRC} playsInline />
      </VideoSkinComponent>
    </VideoPlayer>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
