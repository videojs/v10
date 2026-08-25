import '@app/styles.css';
import { Chapters } from '@app/shared/react/chapters';
import { LiveVideoPlayer, VideoPlayer } from '@app/shared/react/players';
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
import { getChapters, isLiveSource, SOURCES } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
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
  const Player = live ? LiveVideoPlayer : VideoPlayer;

  // A source carrying DRM license servers has no room in a plain `src`.
  const { source: hlsSource, url } = SOURCES[source];

  return (
    <SandboxI18nProvider>
      <Player poster={poster}>
        {/* The skin renders its own <img> from `poster`; supplying one is what lets it carry a CORS mode. */}
        <VideoSkinComponent
          renderPoster={<img alt="" crossOrigin="" />}
          skin={skin}
          styling={styling}
          live={live}
          className="mx-auto aspect-video max-w-4xl"
        >
          <HlsJsVideo
            {...(hlsSource ? { source: hlsSource } : { src: url ?? '' })}
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            preload={preload}
            playsInline
            crossOrigin=""
          >
            <Chapters tracks={getChapters(source)} />
            <Storyboard src={storyboard} />
          </HlsJsVideo>
        </VideoSkinComponent>
      </Player>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
