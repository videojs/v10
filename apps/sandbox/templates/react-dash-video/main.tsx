import '@app/styles.css';
import { VideoPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { VideoSkinComponent } from '@app/shared/react/skins';
import { useSandbox } from '@app/shared/react/use-sandbox';
import { SOURCES } from '@app/shared/sources';
import { DashVideo } from '@videojs/react/media/dash-video';
import { MuxData } from '@videojs/react/extensions/mux-data';
import { createRoot } from 'react-dom/client';

function App() {
  const { skin, styling, source, mediaProps } = useSandbox();

  return (
    <SandboxI18nProvider>
      <VideoPlayer>
        <VideoSkinComponent skin={skin} styling={styling} className="mx-auto aspect-video max-w-4xl">
          <DashVideo src={SOURCES[source].url ?? ''} {...mediaProps} playsInline crossOrigin="" />
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
