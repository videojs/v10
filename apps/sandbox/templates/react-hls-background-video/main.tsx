import '@app/styles.css';
import '@videojs/react/background/skin.css';
import { BackgroundVideoPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { useSource } from '@app/shared/react/use-source';
import { SOURCES } from '@app/shared/sources';
import { BackgroundVideoSkin } from '@videojs/react/background';
import { HlsBackgroundVideo } from '@videojs/react/media/hls-background-video';
import { createRoot } from 'react-dom/client';

// The SPF-backed counterpart to `react-background-video`. See that page's HTML
// sibling for what differs: the engine streams HLS and pins one rendition rather
// than handing a progressive MP4 to the browser.
//
// Unlike that native sibling this one takes the source picker, since `src` is an
// ordinary HLS URL — see `html-hls-background-video` for what each source shape is
// there to reach.
//
// No cap, so the pinned rendition is the largest that fits the screen.
// `react-mux-background-video` is this same component under its Mux-flavored name,
// pointed at a URL that caps the manifest instead.

function App() {
  const source = useSource();

  return (
    <SandboxI18nProvider>
      <BackgroundVideoPlayer>
        <BackgroundVideoSkin>
          <HlsBackgroundVideo src={SOURCES[source].url ?? ''} crossOrigin="" />
        </BackgroundVideoSkin>
      </BackgroundVideoPlayer>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
