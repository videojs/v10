import '@app/styles.css';
import '@videojs/react/background/skin.css';
import { BackgroundVideoPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { HLS_BACKGROUND_VIDEO_SRC } from '@app/shared/sources';
import { BackgroundVideoSkin } from '@videojs/react/background';
import { MuxBackgroundVideo } from '@videojs/react/media/mux-background-video';
import { createRoot } from 'react-dom/client';

// `MuxBackgroundVideo` is `HlsBackgroundVideo` under its Mux-flavored name — the
// same component, so `react-hls-background-video` is the same page with the other
// name. What this one adds is `?max_resolution=720p`: capping the rendition is a
// Mux URL param rather than a prop, so the excluded renditions are absent from the
// manifest rather than present and unpicked.

function App() {
  return (
    <SandboxI18nProvider>
      <BackgroundVideoPlayer>
        <BackgroundVideoSkin>
          <MuxBackgroundVideo src={`${HLS_BACKGROUND_VIDEO_SRC}?max_resolution=720p`} />
        </BackgroundVideoSkin>
      </BackgroundVideoPlayer>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
