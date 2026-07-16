import '@app/styles.css';
import { getPlaybackId } from '@app/shared/mux';
import { LiveVideoProvider, VideoProvider } from '@app/shared/react/providers';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { Storyboard } from '@app/shared/react/storyboard';
import { useAutoplay } from '@app/shared/react/use-autoplay';
import { useLoop } from '@app/shared/react/use-loop';
import { useMuted } from '@app/shared/react/use-muted';
import { usePlaceholder } from '@app/shared/react/use-placeholder';
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
  const placeholder = usePlaceholder();
  const storyboard = useStoryboard();
  const live = isLiveSource(source);
  const autoplay = useAutoplay();
  const muted = useMuted();
  const loop = useLoop();
  const preload = usePreload();
  const playbackId = getPlaybackId(source);
  const Provider = live ? LiveVideoProvider : VideoProvider;

  // Prefer the Mux playback ID; fall back to a raw src for non-Mux sources.
  const sourceProps = playbackId ? { playbackId } : { src: SOURCES[source].url };

  return (
    <SandboxI18nProvider>
      <Provider>
        <VideoSkinComponent
          poster={poster}
          placeholder={placeholder}
          skin={skin}
          styling={styling}
          live={live}
          className="aspect-video max-w-4xl mx-auto"
        >
          <MuxVideo
            {...sourceProps}
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
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
