import '@app/styles.css';
import '@videojs/react/background/skin.css';
import { BackgroundVideoProvider } from '@app/shared/react/providers';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { HLS_BACKGROUND_VIDEO_SRC } from '@app/shared/sources';
import { BackgroundVideoSkin } from '@videojs/react/background';
import { MuxBackgroundVideo } from '@videojs/react/media/mux-background-video';
import { createRoot } from 'react-dom/client';

// The SPF-backed counterpart to `react-background-video`. See that page's HTML
// sibling for what differs: the engine streams HLS and pins one rendition rather
// than handing a progressive MP4 to the browser, the source must be CMAF/fMP4,
// and capping the rendition is a Mux URL param rather than a prop.

function App() {
  return (
    <SandboxI18nProvider>
      <BackgroundVideoProvider>
        <BackgroundVideoSkin>
          <MuxBackgroundVideo src={`${HLS_BACKGROUND_VIDEO_SRC}?max_resolution=720p`} />
        </BackgroundVideoSkin>
      </BackgroundVideoProvider>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
