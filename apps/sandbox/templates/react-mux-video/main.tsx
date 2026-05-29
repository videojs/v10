import '@app/styles.css';
import { LiveVideoProvider, VideoProvider } from '@app/shared/react/providers';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { Storyboard } from '@app/shared/react/storyboard';
import { useAutoplay } from '@app/shared/react/use-autoplay';
import { useLoop } from '@app/shared/react/use-loop';
import { useMuted } from '@app/shared/react/use-muted';
import { usePoster } from '@app/shared/react/use-poster';
import { usePreload } from '@app/shared/react/use-preload';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { useStoryboard } from '@app/shared/react/use-storyboard';
import { isLiveSource, SOURCES } from '@app/shared/sources';
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
  const live = isLiveSource(source);
  const autoplay = useAutoplay();
  const muted = useMuted();
  const loop = useLoop();
  const preload = usePreload();
  const Provider = live ? LiveVideoProvider : VideoProvider;

  return (
    <Provider>
      <VideoSkinComponent
        poster={poster}
        skin={skin}
        styling={styling}
        live={live}
        className="aspect-video max-w-4xl mx-auto"
      >
        <MuxVideo
          src={SOURCES[source].url}
          debug
          autoPlay={autoplay}
          muted={muted}
          loop={loop}
          preload={preload}
          playsInline
          crossOrigin="anonymous"
        >
          <Storyboard src={storyboard} />
        </MuxVideo>
      </VideoSkinComponent>
    </Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
