import '@app/styles.css';
import { AudioPlayer, LiveAudioPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { AudioSkinComponent } from '@app/shared/react/skins';
import { useSandbox } from '@app/shared/react/use-sandbox';
import { isLiveSource, SOURCES } from '@app/shared/sources';
import { HlsAudio } from '@videojs/react/media/hls-audio';
import { createRoot } from 'react-dom/client';

function App() {
  const { skin, styling, source, mediaProps } = useSandbox();
  const live = isLiveSource(source);
  const Player = live ? LiveAudioPlayer : AudioPlayer;

  return (
    <SandboxI18nProvider>
      <Player>
        <AudioSkinComponent skin={skin} styling={styling} live={live} className="mx-auto w-full max-w-xl">
          <HlsAudio src={SOURCES[source].url ?? ''} {...mediaProps} crossOrigin="" />
        </AudioSkinComponent>
      </Player>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
