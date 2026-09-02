import '@app/styles.css';
import { Chapters } from '@app/shared/react/chapters';
import { LiveVideoPlayer, VideoPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { Storyboard } from '@app/shared/react/storyboard';
import { useSandbox } from '@app/shared/react/use-sandbox';
import { getChapters, getPosterSrc, getStoryboardSrc, isLiveSource, SOURCES } from '@app/shared/sources';
import { NativeHlsVideo } from '@videojs/react/media/native-hls-video';
import { createRoot } from 'react-dom/client';

function App() {
  const { skin, styling, source, mediaProps } = useSandbox();
  const live = isLiveSource(source);
  const Player = live ? LiveVideoPlayer : VideoPlayer;

  // A source carrying DRM license servers has no room in a plain `src`. Only the
  // FairPlay entry of its `drm` is read here — the systems the same object names
  // for hls.js are ignored.
  const { source: hlsSource, url } = SOURCES[source];

  return (
    <SandboxI18nProvider>
      <Player poster={getPosterSrc(source)}>
        {/* The skin renders its own <img> from `poster`; supplying one is what lets it carry a CORS mode. */}
        <VideoSkinComponent
          renderPoster={<img alt="" crossOrigin="" />}
          skin={skin}
          styling={styling}
          live={live}
          className="mx-auto aspect-video w-full max-w-4xl"
        >
          <NativeHlsVideo
            {...(hlsSource ? { source: hlsSource } : { src: url ?? '' })}
            {...mediaProps}
            playsInline
            crossOrigin=""
          >
            <Chapters tracks={getChapters(source)} />
            <Storyboard src={getStoryboardSrc(source)} />
          </NativeHlsVideo>
        </VideoSkinComponent>
      </Player>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
