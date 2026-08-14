import '@app/styles.css';
import '@videojs/react/background/skin.css';
import { BackgroundVideoPlayer } from '@app/shared/react/players';
import { SandboxI18nProvider } from '@app/shared/react/sandbox-i18n';
import { BACKGROUND_VIDEO_SRC } from '@app/shared/sources';
import { BackgroundVideo, BackgroundVideoSkin } from '@videojs/react/background';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <SandboxI18nProvider>
      <BackgroundVideoPlayer>
        <BackgroundVideoSkin>
          <BackgroundVideo src={BACKGROUND_VIDEO_SRC} />
        </BackgroundVideoSkin>
      </BackgroundVideoPlayer>
    </SandboxI18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
