import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useSandbox } from '@app/shared/react/use-sandbox';
import { SOURCES } from '@app/shared/sources';
import { ShakaVideo } from '@videojs/react/media/shaka-video';
import { createRoot } from 'react-dom/client';

function App() {
  const { skin, styling, source, mediaProps } = useSandbox();

  return (
    <SandboxI18nProvider>
      <VideoPlayer>
        <VideoSkinComponent skin={skin} styling={styling}>
          {/* Shaka plays DASH and HLS from the same element, so the source list here is not
              narrowed to one manifest format the way the dash.js sandbox is. */}
          <ShakaVideo src={SOURCES[source].url ?? ''} {...mediaProps} playsInline crossOrigin="" />
        </VideoSkinComponent>
      </VideoPlayer>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
