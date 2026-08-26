import '@app/styles.css';
import { Chapters } from '@app/shared/react/chapters';
import { VideoPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
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
import { getChapters, SOURCES } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { Video } from '@videojs/react/video';
import { createRoot } from 'react-dom/client';

function readStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

function App() {
  const skin = useSkin();
  const source = useSource();
  const styling = readStyling();
  const poster = usePoster();
  const storyboard = useStoryboard();
  const autoplay = useAutoplay();
  const muted = useMuted();
  const loop = useLoop();
  const preload = usePreload();

  return (
    <SandboxI18nProvider>
      <VideoPlayer poster={poster}>
        {/* The skin renders its own <img> from `poster`; supplying one is what lets it carry a CORS mode. */}
        <VideoSkinComponent
          renderPoster={<img alt="" crossOrigin="" />}
          skin={skin}
          styling={styling}
          className="mx-auto aspect-video max-w-4xl"
        >
          <Video
            src={SOURCES[source].url}
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            preload={preload}
            playsInline
            crossOrigin=""
          >
            <Chapters tracks={getChapters(source)} />
            <Storyboard src={storyboard} />
          </Video>
        </VideoSkinComponent>
      </VideoPlayer>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
