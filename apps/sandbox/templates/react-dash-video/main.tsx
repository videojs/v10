import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useAutoplay } from '@app/shared/react/use-autoplay';
import { useLoop } from '@app/shared/react/use-loop';
import { useMuted } from '@app/shared/react/use-muted';
import { usePreload } from '@app/shared/react/use-preload';
import { useSkin } from '@app/shared/react/use-skin';
import { useSource } from '@app/shared/react/use-source';
import { SOURCES } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { DashVideo } from '@videojs/react/media/dash-video';
import { MuxData } from '@videojs/react/media/mux-data';
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

  return (
    <SandboxI18nProvider>
      <VideoPlayer>
        <VideoSkinComponent skin={skin} styling={styling} className="aspect-video max-w-4xl mx-auto">
          <DashVideo
            src={SOURCES[source].url ?? ''}
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            preload={preload}
            playsInline
          />
          {/* Mux Data is an opt-in media component. It hands the dash.js engine to the Mux Data
              SDK, so views carry stream-level detail. These streams aren't Mux-hosted, so the
              sandbox env key is what attributes the views. */}
          <MuxData playerSoftwareName="dash-video" envKey="o9b7ge20gji31ao0rub18505f" />
        </VideoSkinComponent>
      </VideoPlayer>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
