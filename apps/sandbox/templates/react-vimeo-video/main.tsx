import '@app/styles.css';
import { VideoProvider } from '@app/shared/react/providers';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useAutoplay } from '@app/shared/react/use-autoplay';
import { useLoop } from '@app/shared/react/use-loop';
import { useMuted } from '@app/shared/react/use-muted';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { SOURCES } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { VimeoVideo } from '@videojs/react/media/vimeo-video';
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

function readStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

function App() {
  const skin = useSkin();
  const source = useSource(false, true);
  const styling = useMemo(readStyling, []);
  const autoplay = useAutoplay();
  const muted = useMuted();
  const loop = useLoop();

  return (
    <VideoProvider>
      <VideoSkinComponent skin={skin} styling={styling} className="aspect-video max-w-4xl mx-auto">
        <VimeoVideo src={SOURCES[source].url} autoplay={autoplay} muted={muted} loop={loop} controls={false} />
      </VideoSkinComponent>
    </VideoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
