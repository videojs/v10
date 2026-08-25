import '@app/styles.css';
import { LiveVideoPlayer, VideoPlayer } from '@app/shared/react/players';
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
import { MuxVideo } from '@videojs/react/media/mux-video/spf';
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// The SPF-backed counterpart to `react-mux-video`. See that page's HTML sibling
// for what differs: SPF appends fMP4/CMAF only, so MPEG-TS and DRM playback IDs
// are expected to surface the unsupported-source error rather than play.
//
// Mux Data and Cast both work here, as on the hls.js-backed page — Mux Data
// monitors this flavor from the media element alone, since its engine
// integrations are hls.js and dash.js.

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
  const Player = live ? LiveVideoPlayer : VideoPlayer;

  // A source carrying signed tokens has no room in a plain `src`. A `drm.token`
  // is accepted but inert on this flavor.
  const { source: muxSource, url } = SOURCES[source];

  return (
    <SandboxI18nProvider>
      <Player poster={poster}>
        <VideoSkinComponent
          renderPoster={
            placeholder ? (
              <img
                alt=""
                crossOrigin=""
                style={{
                  backgroundImage: `url("${placeholder}")`,
                  backgroundPosition: 'var(--media-object-position, center)',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'contain',
                }}
              />
            ) : undefined
          }
          skin={skin}
          styling={styling}
          live={live}
          className="mx-auto aspect-video max-w-4xl"
        >
          {/* The storyboard track is derived automatically from the Mux src. */}
          <MuxVideo
            {...(muxSource ? { source: muxSource } : { src: url ?? '' })}
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            preload={preload}
            playsInline
            crossOrigin=""
          />
          {/* Opt-in media components; no env key is needed for Mux-hosted sources. */}
          <MuxData playerSoftwareName="mux-video" />
          <GoogleCast />
        </VideoSkinComponent>
      </Player>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
