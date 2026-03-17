import '@app/styles.css';
import { MuxPoster } from '@app/shared/react/mux-poster';
import { MuxStoryboard } from '@app/shared/react/mux-storyboard';
import { VideoProvider } from '@app/shared/react/providers';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { SOURCES } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { SimpleHlsVideo } from '@videojs/react/media/simple-hls-video';
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

function readStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

function App() {
  const skin = useSkin();
  const source = useSource();
  const styling = useMemo(readStyling, []);

  return (
    <VideoProvider>
      <VideoSkinComponent skin={skin} styling={styling} className="w-full aspect-video max-w-4xl mx-auto">
        <SimpleHlsVideo src={SOURCES[source].url} playsInline crossOrigin="anonymous">
          <MuxStoryboard source={source} />
        </SimpleHlsVideo>
        <MuxPoster source={source} />
      </VideoSkinComponent>
    </VideoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
