import '@app/styles.css';
import '@videojs/react/background/skin.css';
import { BackgroundVideoProvider } from '@app/shared/react/providers';
import { BACKGROUND_VIDEO_SRC } from '@app/shared/sources';
import { BackgroundVideo, BackgroundVideoSkin } from '@videojs/react/background';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <BackgroundVideoProvider>
      <BackgroundVideoSkin>
        <BackgroundVideo src={BACKGROUND_VIDEO_SRC} />
      </BackgroundVideoSkin>
    </BackgroundVideoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
