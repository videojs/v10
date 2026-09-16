import '@app/styles.css';
import { AudioPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { AudioSkinComponent } from '@app/shared/react/skins';
import { useSandbox } from '@app/shared/react/use-sandbox';
import { SOURCES } from '@app/shared/sources';
import { Audio } from '@videojs/react/audio';
import { createRoot } from 'react-dom/client';

function App() {
  const { source, mediaProps } = useSandbox();

  return (
    <SandboxI18nProvider>
      <AudioPlayer>
        <AudioSkinComponent>
          <Audio src={SOURCES[source].url} {...mediaProps} crossOrigin="" />
        </AudioSkinComponent>
      </AudioPlayer>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
