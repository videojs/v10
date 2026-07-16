import '@app/styles.css';
import { getPlaybackId } from '@app/shared/mux';
import { AudioProvider } from '@app/shared/react/providers';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { AudioSkinComponent } from '@app/shared/react/skins';
import { useAutoplay } from '@app/shared/react/use-autoplay';
import { useLoop } from '@app/shared/react/use-loop';
import { useMuted } from '@app/shared/react/use-muted';
import { usePreload } from '@app/shared/react/use-preload';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { SOURCES } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { MuxAudio } from '@videojs/react/media/mux-audio';
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

function readStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

function App() {
  const skin = useSkin();
  const source = useSource();
  const styling = useMemo(readStyling, []);
  const autoplay = useAutoplay();
  const muted = useMuted();
  const loop = useLoop();
  const preload = usePreload();
  const playbackId = getPlaybackId(source);

  // Prefer the Mux playback ID; fall back to a raw src for non-Mux sources.
  const sourceProps = playbackId ? { playbackId } : { src: SOURCES[source].url };

  return (
    <SandboxI18nProvider>
      <AudioProvider>
        <AudioSkinComponent skin={skin} styling={styling} className="w-full max-w-xl mx-auto">
          <MuxAudio
            {...sourceProps}
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            preload={preload}
            crossOrigin="anonymous"
          />
        </AudioSkinComponent>
      </AudioProvider>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
