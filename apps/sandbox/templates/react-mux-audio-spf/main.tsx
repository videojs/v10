import '@app/styles.css';
import { AudioPlayer } from '@app/shared/react/players';
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
import { GoogleCast } from '@videojs/react/media/google-cast';
import { MuxAudio } from '@videojs/react/media/mux-audio/spf';
import { MuxData } from '@videojs/react/media/mux-data';
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// The SPF-backed counterpart to `react-mux-audio`. See that page's HTML sibling
// for what differs: the audio-only engine fetches only audio renditions, and SPF
// appends fMP4/CMAF only, so MPEG-TS and DRM playback IDs are expected to surface
// the unsupported-source error rather than play.

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

  // A source carrying signed tokens has no room in a plain `src`. A `drm.token`
  // is accepted but inert on this flavor.
  const { source: muxSource, url } = SOURCES[source];

  return (
    <SandboxI18nProvider>
      <AudioPlayer>
        <AudioSkinComponent skin={skin} styling={styling} className="w-full max-w-xl mx-auto">
          <MuxAudio
            {...(muxSource ? { source: muxSource } : { src: url ?? '' })}
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            preload={preload}
            crossOrigin="anonymous"
          />
          {/*
            Both are opt-in media components, and no env key is needed for Mux-hosted sources.
            Mux Data monitors this flavor from the media element alone: its engine integrations are
            hls.js and dash.js, so an SPF engine gets element-level data and says so in dev.
          */}
          <MuxData playerSoftwareName="mux-audio" />
          <GoogleCast />
        </AudioSkinComponent>
      </AudioPlayer>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
