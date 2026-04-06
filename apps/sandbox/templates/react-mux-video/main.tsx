import '@app/styles.css';
import { VideoProvider } from '@app/shared/react/providers';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { Storyboard } from '@app/shared/react/storyboard';
import { usePoster } from '@app/shared/react/use-poster';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { useStoryboard } from '@app/shared/react/use-storyboard';
import { SOURCES } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { MuxVideo } from '@videojs/react/media/mux-video';
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

function readStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

function App() {
  const skin = useSkin();
  const source = useSource();
  const styling = useMemo(readStyling, []);
  const poster = usePoster();
  const storyboard = useStoryboard();

  const sourceAttr =
    SOURCES[source].type === 'mp4' ? { src: SOURCES[source].url } : { playbackId: SOURCES[source].playbackId };

  return (
    <VideoProvider>
      <VideoSkinComponent poster={poster} skin={skin} styling={styling} className="aspect-video max-w-4xl mx-auto">
        <MuxVideo {...sourceAttr} debug playsInline crossOrigin="anonymous">
          <Storyboard src={storyboard} />
        </MuxVideo>
      </VideoSkinComponent>
    </VideoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
