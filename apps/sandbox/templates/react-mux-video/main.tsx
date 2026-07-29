import '@app/styles.css';
import { LiveVideoProvider, VideoProvider } from '@app/shared/react/providers';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useAutoplay } from '@app/shared/react/use-autoplay';
import { useLoop } from '@app/shared/react/use-loop';
import { useMuted } from '@app/shared/react/use-muted';
import { usePlaceholder } from '@app/shared/react/use-placeholder';
import { usePoster } from '@app/shared/react/use-poster';
import { usePreload } from '@app/shared/react/use-preload';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { isLiveSource, SOURCES } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { GoogleCast } from '@videojs/react/media/google-cast';
import { MuxData } from '@videojs/react/media/mux-data';
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
  const live = isLiveSource(source);
  const autoplay = useAutoplay();
  const muted = useMuted();
  const loop = useLoop();
  const preload = usePreload();
  const Provider = live ? LiveVideoProvider : VideoProvider;

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
          {/* The storyboard track is derived automatically from the Mux src. */}
          <MuxVideo
            src={SOURCES[source].url}
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            preload={preload}
            playsInline
            crossOrigin="anonymous"
          />
          {/* Mux Data and Cast are opt-in media components; no env key is needed for Mux-hosted sources. */}
          <MuxData playerSoftwareName="mux-video" />
          <GoogleCast />
        </VideoSkinComponent>
      </Provider>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
